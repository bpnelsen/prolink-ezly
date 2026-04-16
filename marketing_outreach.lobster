name: ezly-marketing-outreach
args:
  contractor_email:
    required: true
steps:
  - id: generate
    pipeline: >
      llm.invoke --provider openclaw --prompt "Draft a personalized email to this contractor ${contractor_email} introducing Prolink-EZLY, using the company and project context available."
      --stdin prolink-ezly/email_draft.html

  - id: approve_draft
    approval: Please review and approve the draft for ${contractor_email}.
    stdin: $generate.stdout

  - id: send
    run: himalaya message send --to ${contractor_email} --subject "Take Control of Your Ops with Prolink-EZLY" --content-type html
    stdin: $generate.stdout
    when: $approve_draft.approved
