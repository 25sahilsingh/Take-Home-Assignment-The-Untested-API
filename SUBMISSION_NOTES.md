# Submission Notes

**What you'd test next if you had more time:**
I would expand the tests to cover malicious inputs and edge cases for all update operations, such as attempting to inject large payloads or unexpected property types. I'd also write tests to verify how the API handles concurrent updates and ensure that timestamps like `completedAt` are functioning correctly across timezones.

**Anything that surprised you in the codebase:**
I was surprised that the `update` method directly spreads all provided fields onto the task without filtering, which unintentionally allows clients to overwrite immutable fields like `id` and `createdAt`. The fact that `completeTask` hardcoded the priority back to 'medium' was also a bit surprising.

**Any questions you'd ask before shipping this to production:**
1. How should we handle data persistence? Currently, everything is in-memory and will be lost on restarts.
2. Are there any authentication or authorization requirements for creating, assigning, or deleting tasks?
3. Should we implement stricter schema validation (e.g., using Joi or Zod) to reject requests with unrecognized fields?
