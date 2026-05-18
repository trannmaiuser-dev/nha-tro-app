# T-043 — Chat nhóm multi-group

## P — Plan
**Requirements §3.6**: "Chat nhóm: giữa chủ trọ và tất cả khách thuê".

**Schema (migration v23)**: chat_groups + chat_group_members + messages.group_id.

**Architecture**:
- Owner tạo nhiều nhóm (multi-group) qua `/admin/chat-groups`
- Owner + tenant chat trong nhóm qua `/chat-groups/[id]`
- Tenant list nhóm của mình qua `/chat-groups`
- Messages reuse existing `messages` table với group_id FK
- Polling refresh 5s (defer Supabase Realtime nâng cấp)

## D — Do
- supabase/migrations-v23.sql + work/t043-apply-migration-prompt.md
- lib/db/chat-groups.ts — full CRUD: createGroup, listGroupsForUser, getGroupForUser,
  addMemberToGroup, removeMemberFromGroup, softDeleteGroup, getMessagesForGroup,
  sendGroupMessage, listEligibleUsers
- app/admin/chat-groups/ — owner CRUD page (list + create modal + manage modal)
- app/chat-groups/ — list groups user is in
- app/chat-groups/[id]/ — group chat thread + composer
- components/chat/GroupChatWindow.tsx — client component with polling
- app/api/chat-groups/[id]/messages/route.ts — JSON endpoint cho polling

## C — Check
- tsc + build pass
- Authz: getGroupForUser verify isMember || isOwner before access
- Owner can manage ANY group; tenant can only chat in groups they're member of

## E — Phase E (smoke, sau apply migration v23)
1. Apply migration v23 qua Supabase Studio
2. Restart dev → impersonate owner → /admin/chat-groups
3. Create "Tất cả khách thuê" nhóm
4. Add member test1 (tenant) qua manage modal
5. Click vào nhóm → composer → gửi "Chào cả nhà"
6. Impersonate test1 → /chat-groups → thấy nhóm
7. Click vào nhóm → thấy tin nhắn của owner + reply "Hi"
8. Owner reload → thấy reply (polling 5s)

## A — Act
- Commit + FF merge main + push
- **MIGRATION v23 PENDING APPLY** — runtime smoke phụ thuộc user apply

## Notes (defer)
- Supabase Realtime upgrade (replace 5s polling) — scaleup task
- Image upload trong group message — reuse existing upload pattern khi cần
- Push notification cho group message (best-effort tới tất cả members) — task tiếp
