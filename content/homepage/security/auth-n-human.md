### GitHub SSO for Users

Users log in via GitHub Single Sign-On (SSO). Session cookies are `httpOnly`, encrypted and include a message authentication code (MAC) signature for integrity.

Session information includes

| Property | Description |
|:--|:--|
| `userId` | User's ID |
| `householdId` | Used for Authorization as all resources roll up to a household. |
| `securityPrincpal` | e.g., `{user:userId}` which is used for tracking changes to receipts, splits, etc. |
