# MethodIQ Analysis Studio demo

PR Studio records the current MethodIQ Analysis Studio UI with synthetic data. The clip shows a researcher uploading a generated 120-row SPSS file, writing a client question, confirming outcome and predictor roles, running regression, reading its warning, and then running the built-in 800-customer churn example. It introduces the intended users, their purpose, and a conversational instruction example.

Run `node docs/demo-scripts/methodiq-analysis-studio/render.mjs` while the current Analysis Studio server listens on port 18814. Set `ANALYSIS_PYTHON` to a Python with pandas, NumPy, and pyreadstat if the default local app venv path differs. The recording uses actual local application clicks, not a simulated interface. The public app uses central login; the recording is identified as a local synthetic-data run. The script synthesizes Korean narration through PR Studio, burns concise Korean captions into the video, decodes the result with ffmpeg, and writes a probe receipt.

Generated media stays under ignored `out/methodiq-analysis-studio/`. Publish the verified MP4 as a PR Studio GitHub release asset, then use that fixed release URL for the CI Portal card. Never commit audio, video, credentials, or customer data.
