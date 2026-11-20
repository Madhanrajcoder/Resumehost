import { useEffect, useRef, useState } from 'react';
import {
  Award, Braces, Check, Code2, Copy, Database, GitBranch, GraduationCap,
  Languages, Mail, MapPin, Menu, Monitor, Server, Sparkles, X,
} from 'lucide-react';
import localPortfolio from './content/portfolio.json';
import Games from './Games.jsx';

const navigation = [
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'stack', label: 'Tech stack' },
  { id: 'games', label: 'Games' },
];

const skillIcons = {
  frontend: Monitor, backend: Server, ai: Sparkles, quality: GitBranch,
};

const apiOrigin = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const portfolioEndpoint = (apiOrigin || import.meta.env.DEV) ? `${apiOrigin ?? ''}/api/portfolio` : null;

function usePortfolio() {
  const [portfolio, setPortfolio] = useState(localPortfolio);

  useEffect(() => {
    if (!portfolioEndpoint) return undefined;

    const request = new AbortController();
    fetch(portfolioEndpoint, { signal: request.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.schemaVersion === localPortfolio.schemaVersion) setPortfolio(data);
      })
      .catch(() => {
        // Keep the bundled portfolio available while the API starts or recovers.
      });

    return () => request.abort();
  }, []);

  return portfolio;
}

function useScrollReveal() {
  useEffect(() => {
    if (!window.IntersectionObserver || matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    const sections = document.querySelectorAll('[data-reveal]');

    for (const section of sections) {
      if (section.getBoundingClientRect().top > window.innerHeight) {
        section.classList.add('reveal-pending');
        observer.observe(section);
      }
    }

    return () => {
      observer.disconnect();
      sections.forEach((section) => section.classList.remove('reveal-pending'));
    };
  }, []);
}

function Brand({ name }) {
  return (
    <a className="brand" href="#top">
      <span className="brand-mark" aria-hidden="true"><Code2 size={19} strokeWidth={2.4} /></span>
      {name}
    </a>
  );
}

function Header({ name }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);

  function closeOnEscape(event) {
    if (event.key === 'Escape' && menuOpen) {
      setMenuOpen(false);
      menuButton.current?.focus();
    }
  }

  return (
    <header className="site-header" onKeyDown={closeOnEscape}>
      <div className="container header-inner">
        <Brand name={name} />
        <button
          className="icon-button menu-toggle"
          type="button"
          ref={menuButton}
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className="site-nav" id="main-nav" aria-label="Main navigation" data-open={menuOpen}>
          <div className="nav-links">
            {navigation.map(({ id, label }) => (
              <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
          </div>
          <a className="button button-outline header-contact" href="#contact" onClick={() => setMenuOpen(false)}>
            <Mail size={16} aria-hidden="true" /> Let’s talk
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero({ portfolio }) {
  return (
    <>
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow hero-kicker">Hi, I’m {portfolio.name}</p>
          <h1 id="hero-title">Full-stack <span>engineering<span className="hero-period">.</span></span></h1>
          <p className="intro">{portfolio.summary}</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#work">Explore my work</a>
            <a className="button button-outline" href="#contact"><Mail size={18} aria-hidden="true" /> Get in touch</a>
          </div>
          <p className="hero-location"><MapPin size={16} aria-hidden="true" /> {portfolio.location}</p>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-grid" />
          <img className="hero-image" src="/hero-knot.jpg" width="1080" height="1080" alt="" fetchPriority="high" />
        </div>
      </section>
      <section className="container" aria-label="Career highlights">
        <dl className="metrics">
          {portfolio.metrics.map(({ value, label }) => (
            <div className="metric" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

function SectionHeading({ id, label, children }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{label}</p>
      <h2 id={id}>{children}</h2>
    </div>
  );
}

function Tags({ items }) {
  return (
    <ul className="tags" aria-label="Technologies">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function ProjectArtwork({ projectId }) {
  if (projectId === 'translator') {
    return (
      <div className="project-art translator-art" aria-hidden="true">
        <div className="translation-demo">
          <div className="demo-label"><Languages size={17} /> Translation</div>
          <div className="translation-panels">
            <div><span>English</span><strong>Good morning.</strong></div>
            <div><span>French</span><strong>Bonjour.</strong></div>
          </div>
          <div className="demo-context"><Sparkles size={13} /> Glossary context</div>
        </div>
      </div>
    );
  }

  return (
    <div className="project-art api-art" aria-hidden="true">
      <div className="api-diagram">
        <div className="api-node"><Braces size={23} /><span>Client</span></div>
        <div className="api-connection" />
        <div className="api-node api-node-primary"><Server size={23} /><span>REST API</span></div>
        <div className="api-connection" />
        <div className="api-node"><Database size={23} /><span>MongoDB</span></div>
      </div>
    </div>
  );
}

function ProjectDialog({ project, onClose }) {
  const dialog = useRef(null);

  useEffect(() => {
    if (project && !dialog.current.open) dialog.current.showModal();
  }, [project]);

  return (
    <dialog
      ref={dialog}
      className="project-dialog"
      aria-labelledby="project-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current.close();
      }}
    >
      {project && (
        <div className="dialog-content">
          <form method="dialog" className="dialog-close">
            <button className="icon-button" type="submit" aria-label="Close project"><X size={22} /></button>
          </form>
          <p className="eyebrow">{project.category}</p>
          <h2 id="project-dialog-title">{project.name}</h2>
          <p className="dialog-role">{project.role}</p>
          <p>{project.description}</p>
          <ul className="detail-list">
            {project.details.map((detail) => <li key={detail}>{detail}</li>)}
          </ul>
          <Tags items={project.technologies} />
        </div>
      )}
    </dialog>
  );
}

function Work({ projects }) {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <section id="work" className="container page-section" aria-labelledby="work-title">
      <div data-reveal>
        <SectionHeading id="work-title" label="Portfolio">Selected work</SectionHeading>
        <div className="project-grid">
          {projects.map((project) => (
            <article key={project.id} className="project-card">
              <ProjectArtwork projectId={project.id} />
              <div className="project-content">
                <p className="eyebrow project-category">{project.category}</p>
                <h3>{project.name}</h3>
                <p className="project-summary">{project.description}</p>
                <Tags items={project.technologies} />
                <button
                  className="project-link"
                  type="button"
                  aria-label={`View project: ${project.name}`}
                  onClick={() => setSelectedId(project.id)}
                >
                  View project
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
      <ProjectDialog project={projects.find(({ id }) => id === selectedId)} onClose={() => setSelectedId(null)} />
    </section>
  );
}

function Experience({ experience, education, certification }) {
  return (
    <section id="experience" className="container page-section" aria-labelledby="experience-title">
      <div data-reveal>
        <SectionHeading id="experience-title" label="Career">Experience</SectionHeading>
        <div className="experience-grid">
          <article className="experience-panel">
            <div className="company">
              <h3>{experience.company}</h3>
              <p>{experience.location}</p>
            </div>
            <ol className="timeline">
              {experience.roles.map(({ title, period, details }) => (
                <li className="timeline-role" key={title}>
                  <div className="role-heading"><h4>{title}</h4><p>{period}</p></div>
                  {details.length > 0 && (
                    <ul className="detail-list">
                      {details.map((detail) => <li key={detail}>{detail}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </article>
          <div className="credentials">
            <article className="credential">
              <Award size={23} aria-hidden="true" />
              <div><h3>Recognition</h3><p>{experience.awards}</p></div>
            </article>
            <article className="credential">
              <GraduationCap size={23} aria-hidden="true" />
              <div><h3>Education</h3><p>{education.degree}</p><p>{education.school} · {education.year} · GPA {education.gpa}</p></div>
            </article>
            <article className="credential">
              <Braces size={23} aria-hidden="true" />
              <div><h3>Certification</h3><p>{certification.name} · {certification.year}</p></div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stack({ skills, developmentTools }) {
  return (
    <section id="stack" className="container page-section" aria-labelledby="stack-title">
      <div data-reveal>
        <SectionHeading id="stack-title" label="Skills">Tech stack</SectionHeading>
        <div className="skill-grid">
          {skills.map(({ id, name, technologies }) => {
            const Icon = skillIcons[id] ?? Braces;
            return (
              <article className="skill-card" key={id}>
                <span className="skill-icon"><Icon size={22} aria-hidden="true" /></span>
                <h3>{name}</h3>
                <Tags items={technologies} />
              </article>
            );
          })}
        </div>
        <section className="toolkit" aria-labelledby="tools-title">
          <h3 id="tools-title">AI development tools</h3>
          <ul className="skill-grid tool-grid" role="list">
            {developmentTools.map(({ name, description }) => (
              <li className="tool-card" key={name}>
                <h4>{name}</h4>
                <p>{description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

function Contact({ email }) {
  const [copyState, setCopyState] = useState('');

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <section id="contact" className="container page-section contact-section" aria-labelledby="contact-title">
      <div className="contact-panel" data-reveal>
        <SectionHeading id="contact-title" label="Contact">Let’s get in touch.</SectionHeading>
        <p>I’m interested in full-stack and backend roles. If you’re hiring or have a project in mind, send me a note.</p>
        <div className="contact-actions">
          <a className="button button-primary" href={`mailto:${email}`}><Mail size={18} aria-hidden="true" /> Email me</a>
          <button className="button button-outline" type="button" onClick={copyEmail}>
            {copyState === 'copied' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            {copyState === 'copied' ? 'Copied' : 'Copy email'}
          </button>
        </div>
        <p className="contact-address">{email}</p>
        <p role="status" className="copy-feedback">
          {copyState === 'copied' && <span className="sr-only">Email address copied.</span>}
          {copyState === 'failed' && 'Select the address above to copy it.'}
        </p>
      </div>
    </section>
  );
}

export default function App() {
  const portfolio = usePortfolio();
  useScrollReveal();

  return (
    <div id="top">
      <a className="skip-link" href="#main">Skip to content</a>
      <Header name={portfolio.name} />
      <main id="main">
        <Hero portfolio={portfolio} />
        <Work projects={portfolio.projects} />
        <Experience experience={portfolio.experience} education={portfolio.education} certification={portfolio.certification} />
        <Stack
          skills={portfolio.skills}
          developmentTools={portfolio.developmentTools ?? localPortfolio.developmentTools}
        />
        <section id="games" className="container page-section" aria-labelledby="games-title">
          <div data-reveal>
            <div className="section-heading"><h2 id="games-title">Games</h2></div>
            <Games />
          </div>
        </section>
        <Contact email={portfolio.email} />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <Brand name={portfolio.name} />
          <a href="#top" className="back-to-top">Back to top</a>
        </div>
      </footer>
    </div>
  );
}
