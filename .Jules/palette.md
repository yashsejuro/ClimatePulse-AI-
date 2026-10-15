## 2024-10-15 - Form and Icon Accessibility
**Learning:** Found that custom form components like the CitizenReportModal were missing explicit `htmlFor` and `id` bindings between `<label>` and `<input>` elements, which hurts screen reader support and clickable area for inputs. Additionally, icon-only buttons (like image preview remove or modal close) were missing `aria-label`s.
**Action:** Always ensure inputs have `id`s linked to their labels via `htmlFor`, and icon-only buttons have descriptive `aria-label` attributes.
