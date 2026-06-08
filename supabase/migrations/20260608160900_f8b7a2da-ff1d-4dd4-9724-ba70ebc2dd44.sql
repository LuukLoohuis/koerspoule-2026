-- Fix 1: Realtime messages — drop the allow-all SELECT policy so deny-all/topic-scoped policies win
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;

-- Fix 2: team-jerseys public bucket — drop broad SELECT policy that allows listing.
-- Files remain downloadable via public CDN URLs (bucket is public), but clients can no longer enumerate the bucket.
DROP POLICY IF EXISTS "team_jerseys_read" ON storage.objects;