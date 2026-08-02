const WORK_ITEMS = [
  {
    title: "Dense SLAM, in real time",
    body:
      "A feed-forward transformer predicts dense depth and camera pose straight " +
      "from the monocular video stream, no LiDAR, no depth sensor. Submaps are " +
      "stitched on the SL(4) manifold and optimized with GTSAM, so the map stays " +
      "consistent even when your path crosses itself.",
    spec: "VGGT-SLAM 2.0 · SL(4) · GTSAM · loop closure",
  },
  {
    title: "Detection without a label set",
    body:
      "Tell the system what matters in plain language instead of picking from a " +
      "fixed list of classes. Open-set detection segments the objects you asked " +
      "for and anchors them in the 3D map, where they keep their positions as " +
      "the scan grows.",
    spec: "CLIP · SAM3 · open-set 3D detection",
  },
  {
    title: "An agent that knows where things are",
    body:
      "An autonomous spatial agent connects your goal to the live geometry: it " +
      "plans what to track, runs deep scans on regions of interest, and answers " +
      "questions grounded in what the camera has actually seen — during the scan " +
      "and after it.",
    spec: "autonomous missions · grounded Q&A · scene reports",
  },
  {
    title: "Any phone, no app",
    body:
      "Capture runs in the mobile browser — open a link, point the camera, walk. " +
      "The heavy lifting happens on a dedicated GPU session in the cloud, " +
      "streamed back to you as the map assembles.",
    spec: "mobile browser capture · dedicated GPU session",
  },
];

export default function WorkSection() {
  return (
    <section id="work" className="landing-section">
      <div className="container">
        <p className="section-kicker">Our work</p>
        <h2 className="section-title">
          What happens <em>under the hood</em>
        </h2>
        <div className="work-list">
          {WORK_ITEMS.map((item) => (
            <div className="work-item" key={item.title}>
              <div>
                <h3 className="work-item-title">{item.title}</h3>
                <p className="work-item-body">{item.body}</p>
                <p className="work-item-spec">{item.spec}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
