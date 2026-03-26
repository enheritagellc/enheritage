"""S3 media fetcher — downloads objects to a fast tmpfs location."""
from __future__ import annotations

import logging
import os
import tempfile
from typing import Any

import boto3  # type: ignore[import-untyped]
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)

# Prefer /dev/shm (RAM-backed tmpfs on Linux) for lowest latency; fall back
# to the system temp directory when it is not available.
_PREFERRED_TMP = "/dev/shm" if os.path.isdir("/dev/shm") else tempfile.gettempdir()


class S3MediaFetcher:
    """Downloads S3 objects to a local temporary file.

    The caller is responsible for deleting the returned file after use.
    Passing *endpoint_url* overrides the AWS SDK endpoint, which is useful
    when testing against LocalStack.
    """

    def __init__(
        self,
        bucket: str,
        aws_region: str = "us-east-1",
        endpoint_url: str | None = None,
    ) -> None:
        self._bucket = bucket
        session = boto3.session.Session()
        kwargs: dict[str, Any] = {"region_name": aws_region}
        if endpoint_url:
            kwargs["endpoint_url"] = endpoint_url
        self._s3 = session.client("s3", **kwargs)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fetch(self, s3_key: str) -> str:
        """Download *s3_key* from the configured bucket and return its path.

        The file is written to ``/dev/shm`` (or the OS temp dir) with a name
        derived from the S3 key so that the file extension is preserved.
        The caller **must** delete the file when done.

        Args:
            s3_key: The S3 object key, e.g. ``media/interviews/abc123.mp3``.

        Returns:
            Absolute local path to the downloaded file.

        Raises:
            RuntimeError: If the S3 download fails.
        """
        # Preserve original extension so that downstream tools (ffmpeg, etc.)
        # can detect the audio format without reading magic bytes.
        _, ext = os.path.splitext(s3_key)
        suffix = ext if ext else ".audio"

        fd, local_path = tempfile.mkstemp(suffix=suffix, dir=_PREFERRED_TMP)
        os.close(fd)

        logger.info(
            "Downloading s3://%s/%s → %s", self._bucket, s3_key, local_path
        )
        try:
            self._s3.download_file(self._bucket, s3_key, local_path)
        except (BotoCoreError, ClientError) as exc:
            # Clean up the empty temp file before propagating the error.
            try:
                os.unlink(local_path)
            except OSError:
                pass
            raise RuntimeError(
                f"Failed to download s3://{self._bucket}/{s3_key}: {exc}"
            ) from exc

        logger.info("Download complete: %s (%d bytes)", local_path, os.path.getsize(local_path))
        return local_path

    def upload_json(self, s3_key: str, data: str) -> None:
        """Upload a JSON string to S3 at *s3_key*.

        Args:
            s3_key: Destination key in the configured bucket.
            data:   JSON-encoded string to write.
        """
        logger.info("Uploading result to s3://%s/%s", self._bucket, s3_key)
        try:
            self._s3.put_object(
                Bucket=self._bucket,
                Key=s3_key,
                Body=data.encode("utf-8"),
                ContentType="application/json",
            )
        except (BotoCoreError, ClientError) as exc:
            raise RuntimeError(
                f"Failed to upload s3://{self._bucket}/{s3_key}: {exc}"
            ) from exc
        logger.info("Upload complete: s3://%s/%s", self._bucket, s3_key)
