"""Build a JSON test report from pytest's JUnit XML and POST it to the local receiver.

Usage: python ci/send_report.py report.xml
Env:   REPORT_URL (e.g. https://abc.ngrok-free.app/report or http://localhost:8000/report)
       RECEIVER_TOKEN (optional), plus GitHub Actions variables (GITHUB_REPOSITORY, etc.)
"""
import json
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone


def build_report(xml_path):
    tests = []
    root = ET.parse(xml_path).getroot()
    for case in root.iter("testcase"):
        name = case.get("name")
        failure = case.find("failure")
        error = case.find("error")
        skipped = case.find("skipped")
        problem = failure if failure is not None else error
        if problem is not None:
            result, message = "failed", (problem.get("message") or problem.text or "").strip()
        elif skipped is not None:
            result, message = "skipped", (skipped.get("message") or "").strip()
        else:
            result, message = "passed", None
        tests.append({"name": name, "result": result, "failure_message": message})

    passed = sum(t["result"] == "passed" for t in tests)
    failed = sum(t["result"] == "failed" for t in tests)
    env = os.environ.get
    return {
        "repository": env("GITHUB_REPOSITORY", "local/assignment-portal"),
        "branch": env("GITHUB_REF_NAME", "local"),
        "commit_sha": env("GITHUB_SHA", "local"),
        "pipeline_run_id": env("GITHUB_RUN_ID", "local"),
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tests": tests,
        "summary": {
            "total": len(tests),
            "passed": passed,
            "failed": failed,
            "overall_status": "passed" if failed == 0 and len(tests) > 0 else "failed",
        },
    }


def main():
    xml_path = sys.argv[1] if len(sys.argv) > 1 else "report.xml"
    url = os.environ.get("REPORT_URL")
    if not url:
        sys.exit("REPORT_URL is not set")
    if not os.path.exists(xml_path):
        sys.exit(f"{xml_path} not found (did the tests run?)")
    report = build_report(xml_path)
    with open("report-ci.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    headers = {"Content-Type": "application/json", "ngrok-skip-browser-warning": "1", "bypass-tunnel-reminder": "1"}
    if os.environ.get("RECEIVER_TOKEN"):
        headers["X-Token"] = os.environ["RECEIVER_TOKEN"]
    req = urllib.request.Request(url, data=json.dumps(report).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        print("Receiver responded:", resp.status, resp.read().decode().strip())
    print(json.dumps(report["summary"]))


if __name__ == "__main__":
    main()
