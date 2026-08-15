# Bug Report

## 1. getByStatus uses loose substring matching instead of exact match

* **Expected Behavior:** `getByStatus` should only return tasks with a status that exactly matches the input (e.g. searching for "in" should return nothing, searching for "todo" should only return "todo").
* **Actual Behavior:** It uses `String.includes()`, meaning searching for "do" matches "done" and "todo". Searching for "in" matches "in_progress".
* **How I Discovered It:** By writing a unit test that filters for a partial string, which incorrectly returned matched tasks.
* **Fix:** Change `t.status.includes(status)` to `t.status === status` in `src/services/taskService.js`.

## 2. getPaginated calculates offset incorrectly (skipping the first page)

* **Expected Behavior:** When `page=1` and `limit=10`, the function should return tasks 1 through 10.
* **Actual Behavior:** `offset` is calculated as `page * limit`, which results in an offset of `10` when `page=1`. This skips the first 10 items.
* **How I Discovered It:** A unit test fetching `page=1` with `limit=10` only received 5 items when 15 were in the store (items 11-15).
* **Fix:** Change the offset calculation in `src/services/taskService.js` to `(page - 1) * limit`.

## 3. update allows overwriting protected fields like id and createdAt

* **Expected Behavior:** Clients should not be able to change the `id` or `createdAt` of a task via a PUT request.
* **Actual Behavior:** The `update` function spreads the `fields` object directly into the task, overriding any property provided.
* **How I Discovered It:** Sent a PUT request body containing an `id` field and verified it successfully mutated the id.
* **Fix:** In `src/services/taskService.js`, extract only allowed fields (like `title`, `description`, `status`, `priority`, `dueDate`) or omit `id` and `createdAt` before updating.

## 4. completeTask resets a task's priority to 'medium'

* **Expected Behavior:** Marking a high-priority task as done should only update its status and `completedAt` timestamp, leaving priority as 'high'.
* **Actual Behavior:** The `completeTask` function hardcodes `priority: 'medium'` into the updated object.
* **How I Discovered It:** Wrote a test verifying that completing a 'high' priority task preserves its priority.
* **Fix:** Remove the `priority: 'medium'` line in the `updated` object construction within `completeTask` in `src/services/taskService.js`.
