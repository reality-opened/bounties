// Single source of truth for the demo scenes: the landing-page showcase
// gallery and the dashboard demo carousel both read from here, so the
// marketing copy and the agent prompts cannot drift apart.

export interface ShowcaseScene {
  /** Matches the worker's demo catalog video_id (the filename). */
  videoId: string;
  title: string;
  /** Short marketing copy for the landing gallery card. */
  blurb: string;
  /** Static still under public/, regenerated via scripts/extract-scene-thumbs.sh */
  image: string;
  /** Mono-label shown on the card, e.g. "facilities survey". */
  tag: string;
  /** Full agent prompt used when this scene is launched as a demo. */
  prompt: string;
}

export const SHOWCASE_SCENES: ShowcaseScene[] = [
  {
    videoId: "house.MOV",
    title: "Family Home",
    blurb:
      "A walk from entryway to kitchen becomes a dense 3D map with seating, appliances, and storage indexed as the camera moves.",
    image: "/assets/scenes/house.jpg",
    tag: "residential survey",
    prompt:
      "DEMO: Act as a residential environment surveyor exploring a home from entryway to kitchen. " +
      "Assess how spaces are organized and how objects are distributed across living, dining, " +
      "and kitchen areas. Track representative items such as seating, tables, storage areas, " +
      "appliances, food-related objects, and safety equipment. Identify clutter, high-use surfaces, " +
      "and anything notable about room function or layout. Explore and document other relevant objects you encounter.",
  },
  {
    videoId: "office_loop.mp4",
    title: "Research Building",
    blurb:
      "One pass through a university building's hallways: workstations, whiteboards, and safety equipment, all tracked in place.",
    image: "/assets/scenes/office-loop.jpg",
    tag: "facilities survey",
    prompt:
      "DEMO: Act as a facilities survey agent inside a university research building. " +
      "Walk through the hallway and office areas assessing workspace setup, equipment placement, " +
      "and safety infrastructure. Identify and track key items like whiteboards, waste bins, " +
      "lab/kitchen appliances, workstations, access control devices, and emergency equipment. " +
      "Also note transitions in environment (e.g., wall colors or layout changes) and explore " +
      "any additional objects relevant to office operations or safety.",
  },
  {
    videoId: "crime_scene.mov",
    title: "Crime Scene",
    blurb:
      "Evidence markers and disturbed objects documented with their spatial relationships intact with a scene you can re-walk later.",
    image: "/assets/scenes/crime-scene.jpg",
    tag: "forensic documentation",
    prompt:
      "DEMO: Act as a forensic survey agent examining a staged indoor crime scene. " +
      "Document spatial relationships between evidence markers and surrounding objects. " +
      "Track signs of disturbance such as spills, broken items, footprints, displaced furniture, " +
      "or unusual object placements. Explore beyond predefined evidence to identify anything " +
      "potentially relevant to reconstructing events or understanding the scene context.",
  },
  {
    videoId: "disaster.mov",
    title: "Flooded Street",
    blurb:
      "A flood-damaged street surveyed for structural damage, displaced objects, and roadway hazards in a single walk-through.",
    image: "/assets/scenes/disaster.jpg",
    tag: "disaster response",
    prompt:
      "DEMO: Act as a disaster response surveyor assessing damage in a flooded and earthquake-affected " +
      "residential street. Evaluate structural damage, displaced household objects, infrastructure failure, " +
      "and hazards in the roadway. Track representative debris, vehicles, utilities, and structural elements. " +
      "Also explore additional signs of environmental instability or safety risks as you navigate the area.",
  },
  {
    videoId: "disaster2.mov",
    title: "Earthquake Aftermath",
    blurb:
      "Urban damage assessment: debris fields, failed infrastructure, and blocked pathways mapped from one continuous pass.",
    image: "/assets/scenes/disaster-2.jpg",
    tag: "damage assessment",
    prompt:
      "DEMO: Act as an urban damage assessment agent surveying an earthquake aftermath scene. " +
      "Assess building integrity, debris distribution, fallen infrastructure, and abandoned objects. " +
      "Track major structural failures and unusual displaced items. Identify hazards, blocked pathways, " +
      "and environmental conditions such as dust or water. Explore additional features relevant to recovery planning.",
  },
  {
    videoId: "hackathon_loop.MOV",
    title: "Hackathon Venue",
    blurb:
      "A live event space mapped in motion with seating, collaborative work areas, and circulation routes captured as they're used.",
    image: "/assets/scenes/hackathon.jpg",
    tag: "event venue",
    prompt:
      "DEMO: Act as an event environment analysis agent surveying a university hackathon venue. " +
      "Assess crowd activity, workspace setup, seating distribution, and structural layout. " +
      "Track representative furniture, collaborative work areas, staircases, railings, and trash receptacles. " +
      "Explore additional objects that indicate event logistics, attendee behavior, or space utilization.",
  },
  {
    videoId: "house2.MOV",
    title: "Second Interior",
    blurb:
      "A second residential survey focused on layout and usage patterns with furniture, electronics, and storage, room by room.",
    image: "/assets/scenes/house-2.jpg",
    tag: "interior survey",
    prompt:
      "DEMO: Perform a secondary interior survey of a residential home focusing on layout, usage patterns, " +
      "and object distribution. Track common furniture, electronics, storage units, and kitchen appliances. " +
      "Pay attention to how personal items and consumables are arranged. Identify patterns of occupancy " +
      "and explore additional objects that help characterize how the space is used.",
  },
  {
    videoId: "our_workspace.MOV",
    title: "Our Workspace",
    blurb:
      "The team's own table, scanned mid-build with laptops, tools, and the reconstruction itself running on screen.",
    image: "/assets/scenes/workspace.jpg",
    tag: "team workspace",
    prompt:
      "DEMO: Act as a workspace activity observer analyzing a hackathon team area. " +
      "Track laptops, seating, personal belongings, food items, and collaborative tools such as whiteboards. " +
      "Assess workspace density, object clustering, and signs of active development. " +
      "Explore additional objects that help characterize productivity, organization, or team dynamics.",
  },
];

export const DEMO_PROMPT_BY_VIDEO: Record<string, string> = Object.fromEntries(
  SHOWCASE_SCENES.map((scene) => [scene.videoId, scene.prompt]),
);
