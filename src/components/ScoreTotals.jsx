import '../score.css';
export default function ScoreTotals({score}){return <section aria-label="Score"><h2>Score</h2><div className="score-totals" aria-label="Your scores"><div><span>Today’s score</span><strong>{score.today.points}</strong></div><div><span>Overall score</span><strong>{score.overall}</strong></div></div></section>;}
