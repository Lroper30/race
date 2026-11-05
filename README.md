# LANE RUSH — 3D Traffic Run

A third-person 3D arcade traffic-dodging game. Choose oncoming traffic or same-direction traffic, then switch between three lanes to survive. Occasional interstate detours widen to five lanes before a construction zone merges back to the regular road. Ramps launch your car over traffic, and red BMW-badged drivers may swerve into your lane.

## Run it
1. Upload or open `index.html` on its own; the game layout, styling, and game code are all included in that file.
2. Open it in a browser while connected to the internet so the Three.js renderer can load from its CDN.
3. Choose **ONCOMING** or **SAME DIRECTION** to start a run.

## Controls
- **A / D** or **Left / Right Arrow**: change lanes
- **P / Esc**: pause or resume
- **Touch**: swipe left or right on the road
- The car visibly moves between lanes with a smooth steering animation.
- Choose **Easy**, **Medium**, **Hard**, or **Impossible** before a run. Higher difficulties start faster, reach higher top speeds, spawn more traffic, and bring ramps more often. Impossible sends traffic much more frequently and blocks two lanes per wave, leaving one reachable open lane.

## Gameplay
- Dodge sedans, hatchbacks, sports cars, vans, box trucks, and semi trucks.
- Choose whether traffic approaches head-on or travels in your direction.
- Your speed increases with distance, and traffic becomes more frequent and faster.
- The scenery gradually transitions between eight biomes every 3,000 m: forest, desert, alpine, tropical, volcanic, coastal, autumn, and night.
- The road occasionally widens into a five-lane interstate; orange construction cones mark the merge back to the three-lane route.
- Ramps face the direction of travel. Line up with one to drive up its slope and launch over the traffic car ahead; other traffic steers around the ramp.
- Traffic arrives in varied formations while keeping a reachable open lane; Hard mode packs in more traffic.
- Red BMW-badged cars check adjacent lanes before swerving, avoid occupied lanes, and hit the barrier and explode if neither lane is open.
- The run ends when you hit a vehicle.
- Crashes replay the final seconds of the run with traffic, road scenery, and ramps visible, then send the intact player car flying into a larger explosion with a shockwave and sparks.
- Save a crash replay from the results screen or the main menu; saved replays stay in this browser.
- Semi trucks face the direction of their traffic and spawn less often, with a cooldown between semis.
- Normal traffic avoids a ramp's lane while the ramp is in view, and ramps only spawn in lanes clear of approaching traffic.
- Your best distance is saved in your browser using localStorage.

## Single-file version
- `index.html` — standalone game containing the layout, styles, and game code
- The game uses Three.js from a CDN, so an internet connection is required. No local CSS or JavaScript files are needed to run it.

The separate `style.css` and `script.js` files remain available in this project for editing, but the standalone `index.html` does not load them.
