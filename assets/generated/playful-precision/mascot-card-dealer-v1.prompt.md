# Quanty card-dealer pose v1

Mode: built-in `image_gen` with identity reference images. LeetCode review-draw mascot asset.

References:
- `mascot-hero-v5-clean.png`: primary identity, face, plush texture and colors.
- `mascot-poker.png`: secondary character and hoodie reference; all cards/chips removed from the requested pose.

## Generation prompt

Use case: identity-preserve.
Asset type: production transparent PNG mascot sprite for a LeetCode card-draw animation.
Input images: Image 1 is the primary identity, facial proportions, plush surface, and blue/lilac palette reference (mascot-hero-v5-clean). Image 2 is a secondary character/hoodie reference only (mascot-poker). Create ONE new pose of exactly this same Quanty mascot, not a redesign.

Primary request: A beautiful front-facing blue plush baby shark mascot, large friendly smiling face, BOTH shiny blue eyes open, small soft white teeth, creamy white muzzle, blue cheek stitches, prominent shark head fin, white terrycloth headband with the existing embroidered blue letter "Q", wearing the same soft lilac hoodie with white drawstrings. Match the references' highly tactile premium plush 3D rendering. Keep the hoodie otherwise plain, without words.

Pose and practical compositing: show the whole head fin and full hoodie torso down to its rounded lower hem, with both shoulders, elbows, and hands fully visible. The torso is upright and front-facing with a slight playful lean. Both blue plush paws extend forward at LOWER WAIST level, clearly below the chin and mouth, as though gently cradling a fan of cards that will be added later by frontend code. The hands must actually be EMPTY. Viewer-left paw is an open upward-cupped supporting palm near lower center-left; viewer-right paw sits forward at lower center-right, softly curled as a grip with visible rounded fingertips. Leave a useful empty space above and between the paws for frontend cards. Neither hand covers the face. Only two arms and two hands.

Composition: square 1024 by 1024 canvas. Single isolated mascot centered; large readable face in the upper half. Character silhouette roughly spans x=170..860 and y=70..940, with generous transparent padding on all edges. Face center approximately (510,355). Supporting viewer-left paw approximately (390,735); foreground gripping viewer-right paw approximately (640,770). Small natural side tail if visible, no other objects. These coordinates guide composition, not printed content.

Lighting: soft studio lighting, gentle detailed plush shading, clean premium cutout edges. Genuine fully transparent RGBA background and transparent space around/between arms, no backdrop and no floor shadow.

Constraints: Preserve this exact blue shark character and its identity, white Q headband and lilac clothing. No actual playing cards at all, no blank card shapes, no poker chips, no table, no desk, no props, no symbols floating around, no extra characters, no limbs cut off, no multi-pose sheet. No text or logo other than the headband's "Q". No checkerboard painted into the image. Do not copy damaged/cutout artifacts from the references.

## Final refinement prompt

Use case: precise-object-edit. Refine this ONE transparent mascot sprite, preserving the character, expression, materials, colors, camera, clothes, body anatomy, and EMPTY cupped-hand pose exactly. Do not redesign it and do not add objects.

Make only these asset-production corrections:
1. Slightly reduce the full mascot's scale and recenter it inside the same square canvas, so the entire visible silhouette including top fin, side tail, and feet has at least 8 percent truly empty transparent margin at EVERY canvas edge. Full-body height about 80–82 percent of canvas height. Keep all anatomy intact.
2. Clean the cutout: remove cyan/green edge fringe, stray colored pixels, and detached fuzz/ghost specks. Preserve fine natural blue plush fibers and smooth antialiased edges without cyan, white or dark halos. The headband and eyes remain solid normal plush opacity.
3. Preserve a genuinely transparent RGBA background throughout all empty areas, no painted black or checkerboard background, no ground/floor shadow.

Keep the existing embroidered "Q" on the white headband as the sole text, lilac hoodie, large open eyes, smile, exactly two empty blue paws: one palm up at viewer-left lower waist and one rounded gripping paw at viewer-right lower waist. No cards, chips, table, props, extra symbols, or other changes.

## Final asset and animation anchors

- Final asset: `mascot-card-dealer-v1.png`.
- Actual canvas: **1254 × 1254 pixels**, RGBA, 1,034,198 bytes. The generator chose this resolution despite the initial 1024-square request; the image was copied unchanged to preserve its alpha channel.
- Main visible silhouette bounds at alpha ≥ 16: **(325, 122)–(994, 1173)**. Very faint alpha remains outside that box; alpha is preserved unmodified.
- Suggested integration anchors, measured from the top-left of the full canvas: viewer-left cupped palm **(510, 922)** ≈ **40.7%, 73.5%**; viewer-right gripping paw **(760, 935)** ≈ **60.6%, 74.6%**.
- Card-fan pivot suggestion: **(655, 928)** ≈ **52.2%, 74.0%**; let the fan extend upward across the hoodie below the mouth. The final animation keeps the mascot behind the fan, without a duplicated foreground paw, to avoid overlap artifacts.
- Full head, body, both empty paws and tail are present. No cards, chips, table, or words are baked in.
