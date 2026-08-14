import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Facturo crash:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", background: "#16213A", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "sans-serif", padding: 24, textAlign: "center",
        }}>
          <div style={{ maxWidth: 480 }}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Une erreur est survenue</div>
            <p style={{ color: "#B9BFCF", fontSize: 13.5, lineHeight: 1.7 }}>
              {String(this.state.error?.message || this.state.error)}
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
