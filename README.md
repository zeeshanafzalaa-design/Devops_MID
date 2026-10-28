# Assignment Submission Portal (CSC418 DevOps Midterm)

A responsive light-theme website (HTML, CSS, JavaScript) where students submit an assignment link.
Every push to GitHub is tested automatically, and the test report is sent to a local receiver that
saves `test-report.json` on your computer.

## Project structure

```
index.html, style.css, script.js   The website
portal.js                          Validation + saving logic (also used by the tests)
tests/portal.test.js               3 automated tests (Node built-in test runner)
receiver/receiver.py               Local HTTP receiver -> saves test-report.json
ci/send_report.py                  Builds the JSON report from test results and POSTs it
.github/workflows/ci.yml           CI pipeline (tests, report, email, Pages deploy)
package.json                       npm test script
```

## 1. Run the website

Double-click `index.html` (or use the VS Code "Live Server" extension). Submissions are saved in the browser.

## 2. Run the tests

Needs Node.js 20 or newer (`node --version`).

```bash
npm test
```

Tests: valid submission saved and listed; missing registration number rejected; invalid URL rejected.

## 3. Start the local receiver

Needs Python 3.

```bash
python receiver/receiver.py        # listens on port 8000
```
Every report it receives is saved as `test-report.json` in the folder where you started it.

Quick local check (no GitHub needed):
```bash
node --test --test-reporter=junit --test-reporter-destination=report.xml
set REPORT_URL=http://localhost:8000/report      # Windows cmd; PowerShell: $env:REPORT_URL="http://localhost:8000/report"
python ci/send_report.py report.xml
```

## 4. Make the receiver reachable from GitHub (tunnel)

GitHub's runner cannot reach your `localhost`, so expose port 8000 with a tunnel and keep it running:

```bash
ngrok http 8000
```
Copy the public https URL it prints (for example `https://abc123.ngrok-free.app`).

## 5. GitHub repository secrets

Repo -> Settings -> Secrets and variables -> Actions -> New repository secret:

| Secret | Value |
|---|---|
| `REPORT_URL` | `https://<your-tunnel-url>/report` (required) |
| `RECEIVER_TOKEN` | optional shared password (start the receiver with the same `RECEIVER_TOKEN` env var) |
| `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_TO` | bonus email: Gmail address, Gmail App Password, recipient |

## 6. Pipeline behaviour

* Runs on every push (all branches).
* A failing test makes the "Run automated tests" step fail, so the run is red.
* The report step uses `if: always()`, so the JSON is delivered for passing AND failing runs.
* The email step also runs always (only if `MAIL_USER` is set).
* The Pages deploy job has `needs: test` and only runs on `main`, so a failing run never changes the published site.
  Enable it once: Settings -> Pages -> Source: **GitHub Actions**.

## 7. Demo script

1. Push working code -> green run -> `test-report.json` shows `"overall_status": "passed"`.
2. In `portal.js`, change `if (!reg) errors.reg_no = ...` to `if (false) errors.reg_no = ...`, push -> red run -> `test-report.json` shows `"failed"` with a failure message.
3. Undo the change, push -> green run -> `"passed"` again.
