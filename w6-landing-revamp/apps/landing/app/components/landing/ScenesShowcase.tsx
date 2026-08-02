import Image from "next/image";
import { SHOWCASE_SCENES, type ShowcaseScene } from "../scenes";

interface ScenesShowcaseProps {
  onRunScene: (scene: ShowcaseScene) => void;
}

export default function ScenesShowcase({ onRunScene }: ScenesShowcaseProps) {
  return (
    <section id="scenes" className="landing-section">
      <div className="container">
        <p className="section-kicker">Field recordings</p>
        <h2 className="section-title">
          Scenes you can <em>explore</em>
        </h2>
        <p className="section-lead">
          These are real captures reconstructed by the live pipeline. Run any
          of them from your dashboard to replay the full system with mapping,
          detection, and the spatial agent.
        </p>
        <div className="scene-grid">
          {SHOWCASE_SCENES.map((scene) => (
            <article className="scene-card" key={scene.videoId}>
              <div className="scene-card-media">
                <Image
                  src={scene.image}
                  alt={`${scene.title}, sample scene still`}
                  fill
                  sizes="(max-width: 820px) 100vw, 25vw"
                />
                <span className="scene-card-tag">{scene.tag}</span>
              </div>
              <div className="scene-card-body">
                <h3 className="scene-card-title">{scene.title}</h3>
                <p className="scene-card-blurb">{scene.blurb}</p>
                <button
                  className="scene-card-run"
                  type="button"
                  onClick={() => onRunScene(scene)}
                >
                  Run this scene →
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
