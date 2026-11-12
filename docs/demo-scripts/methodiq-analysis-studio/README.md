# MethodIQ Analysis Studio demo

PR Studio records the running MethodIQ Analysis Studio UI with synthetic classroom data. The clip shows a researcher selecting general machine learning, checking variables, running the 800-customer churn example, inspecting validation, and switching to regression. It introduces the intended users, their purpose, and a conversational instruction example.

Run `node docs/demo-scripts/methodiq-analysis-studio/render.mjs` while the local Analysis Studio server listens on port 18814. The recording uses the actual local application code and clicks, not a simulated interface. The public app uses central login; the recording must be identified as a local synthetic-data run. The script synthesizes Korean narration through PR Studio, burns concise Korean captions into the video, decodes the result with ffmpeg, and writes a probe receipt.

Generated media stays under ignored `out/methodiq-analysis-studio/`. Publish the verified MP4 as a PR Studio GitHub release asset, then use that fixed release URL for the CI Portal card. Never commit audio, video, credentials, or customer data.
