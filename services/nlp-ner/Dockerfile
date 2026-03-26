FROM python:3.12-slim AS base
WORKDIR /app
RUN pip install --no-cache-dir uv

FROM base AS deps
COPY pyproject.toml ./
RUN uv pip install --system --no-cache -r pyproject.toml --extra dev || \
    uv pip install --system --no-cache .
# Download the spaCy model so it is baked into the image
RUN python -m spacy download en_core_web_sm

FROM base AS runner
COPY --from=deps /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=deps /usr/local/bin /usr/local/bin
COPY app/ ./app/
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
