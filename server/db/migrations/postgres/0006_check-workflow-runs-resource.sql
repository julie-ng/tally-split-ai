-- Custom SQL migration file, put your code below! --
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_resource_required" CHECK ("upload_id" IS NOT NULL OR "receipt_id" IS NOT NULL);