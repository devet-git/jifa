# Jifa — Backlog các chức năng chưa triển khai

## Hữu ích, scope vừa — có thể làm tiếp khi quay lại

- [x] **Notification digest email** — gửi 1 email tổng hợp/ngày thay vì 1 email/event
- [x] **Project starring / favorites** — pin project yêu thích lên đầu sidebar
- [ ] **Permission scheme tinh hơn** — custom permission per action (xem nhưng không edit comment người khác, v.v.)
- [x] **Bulk edit trên Board view** — hiện chỉ có ở Backlog
- [x] **Issue templates** — pre-fill khi tạo issue mới theo type
- [x] **Required fields per type** — bắt buộc story-points cho Story, v.v.
- [x] **Saved JQL filters** — JQL mode toggle + save/load/delete named filters in BacklogFilterBar

## Cần infrastructure / dịch vụ ngoài

- [x] **Inline rich-text editor** cho description (TipTap / Slate)
- [x] **Image preview / inline screenshots** trong description (đi cùng rich-text)
- [x] **Calendar view** — issues theo due-date trên lịch tháng
- [x] **Confluence-style wiki / project docs** — Làm đơn giản

## Polish / nice-to-have

- [x] **Drag-handle reorder** cho components / versions / boards (hiện chỉ statuses có)
- [x] **Inline edit title trên IssueCard** (đang phải mở IssueDetail)
- [x] **i18n / multi-language** — vài chỗ còn lẫn tiếng Việt cũ trong các modal
- [x] **Sprint retrospective** — sau khi complete sprint, view summary commitments vs delivered
- [x] **Saved board column collapses** — gập lại column trong Kanban
- [x] **Drag-to-resize Gantt bars** — Roadmap hiện chỉ xem, chưa kéo được
- [x] **Avatar upload** — base64 data-URL stored in profile via preferences page
- [x] **Password reset / email verification flow**
- [x] **2FA / TOTP** — setup via Preferences, TOTP code step on login
- [x] **API rate limiting per user**
- [x] **Audit log export to CSV**

## Reports nâng cao

- [x] **Control chart** — variation của cycle time theo thời gian
- [x] **Cumulative Flow Diagram (CFD)** — số issue ở mỗi status theo ngày
- [x] **Sprint retrospective report** — committed vs scope-added mid-sprint
- [x] **Time-in-status report**
- [x] **User workload report** — bao nhiêu issue / story points đang assign cho mỗi user

## Backlog management nâng cao

- [x] **Multi-sprint planning view** — kéo issue vào sprint cụ thể từ backlog với planning view multi-sprint
- [x] **Issue cloning** — duplicate 1 issue với mọi field (POST /:id/clone)
- [x] **Issue conversion** — đổi sub-task → epic và ngược lại
- [x] **Quick-add / inline create** trên board
