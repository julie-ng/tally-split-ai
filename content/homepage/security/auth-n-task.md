### Token Authentication for Tasks

Each task authenticates against Tally Split APIs with a **hash-based message access code (HMAC) token**. Incoming requests require

```
Authorization: Bearer <callbackToken>
X-Workflow-Run-UUID: <runUuid>
X-Task-Id: <taskId>
```

Authentication Steps

- Look up workflow run by UUID.
- Compare run createdAt date and compare with global expiry configuration.
- Check allowed task IDs.
- Verify integrity by recomputing token based on values from database.
