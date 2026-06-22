# Changelog

## 0.1.0

- First public release of the Vynix MCP server.
- Read tools: list_projects, list_annotations, get_annotation, list_comments,
  get_annotation_analysis, get_annotation_screenshots, list_annotation_issues,
  list_project_issues, generate_prompt, get_metrics, list_members, get_activity.
- Write tools (client should confirm): update_annotation_status, add_comment,
  diagnose_annotation, create_github_issue, create_share_link.
- Guided `fix_annotation` prompt that walks an agent from a note to a fix.
- Auth via VYNIX_API_TOKEN, or VYNIX_API_EMAIL + VYNIX_API_PASSWORD.
