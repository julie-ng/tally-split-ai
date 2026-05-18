### Authorization by Household

Every resource read or write filters by the caller's `householdId`. All household members are have equal permissions.

| Resource | How `householdId` is resolved |
|:--|:--|
| `receipts` | Direct column lookup |
| `uploads` | Direct column lookup |
| `splits` | Derived via the linked receipt (`splits.receiptId → receipts.householdId`) |

On mismatch, the response is **404 Not Found** to protect other users' resources.
