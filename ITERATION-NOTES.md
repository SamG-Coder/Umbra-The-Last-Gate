# Iteration record

## Design decisions

The central fantasy is not just fighting dark enemies: it is turning those
victories into allies. Extraction requires an actual unclaimed nearby corpse;
Arise deploys the stored roster as damageable, attacking characters. Levels,
loot and a choice of blessings support different builds rather than merely
increasing a score counter.

Combat uses readable wind-ups and recovery windows, a held three-strike combo,
briefly invulnerable dodges, a piercing cast, hit feedback and an autonomous
legion. The boss has changing attack patterns and enough health to exercise
more than its opening pattern. Three distinct halls create a beginning,
escalation and conclusion instead of an endless undirected arena.

Equipment is deliberately not auto-equipped. The record shows item power and
upgrade arrows; extra gear can be salvaged. Level-up points, shrine forging,
restocking and exported hunters give the small dungeon an RPG progression loop.

## Revisions made during implementation and checks

- The first attack was incorrectly advancing to combo strike two. The failing
  test identified the initial combo timer; it now starts at strike one.
- Cleared halls are persisted explicitly. Reloading after a blessing no longer
  reopens the reward offer or respawns a finished hall.
- Static geometry batching now transforms into the batch root's local space;
  translated roots, such as the throne, are not transformed twice.
- Many authored torches are represented by six active light slots rather than
  keeping every torch in every fragment shader.
- The directional shadow camera projection is explicitly refreshed after
  changing its bounds.
- Shadow dismissal also releases the corresponding active companion.
- Character cleanup disposes actor-owned geometry and materials, including
  the shadow aura, while retaining shared primitive geometry.
- Fast movement and projectiles use substeps to avoid skipping gates, pillars
  or enemies.
- Blade-arc geometry is centred on the actor’s +Z forward direction rather
  than the ring primitive’s default +X direction.
- Warning circles lock their location when a strike starts; moving outside
  the telegraph genuinely avoids its damage.
- Player state, missiles and resource regeneration stop during pause menus.
- New game and save import have explicit replacement confirmation.
- Desktop and landscape-phone menus/HUD were inspected without the 3D scene;
  the touch layout now separates vitals, objectives, shadows and controls.
- Initialisation and frame failures display errors. First-run dependency
  downloads and direct-file restrictions are explained in the launcher/UI.

## What this record does not establish

These revisions were checked by source inspection and automated game-state
simulation. A real graphical play-test, performance measurement, animation
review and audio mix pass could not be performed. The supplied environment did
not expose WebGL2 and did not permit downloading the Three.js runtime. The
build remains a prototype requiring actual browser/device validation.
