import { Component, type ReactNode } from "react";

type AppErrorBoundaryProps = Readonly<{
  children: ReactNode;
}>;

type AppErrorBoundaryState = Readonly<{
  error: Error | null;
}>;

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public override state: AppErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  private readonly retry = () => {
    this.setState({ error: null });
  };

  public override render() {
    if (this.state.error === null) return this.props.children;
    return (
      <main role="alert" aria-labelledby="application-error-title">
        <h1 id="application-error-title">页面暂时没有准备好</h1>
        <p>你的数据没有丢失，可以立即重试。</p>
        <button type="button" onClick={this.retry}>重试</button>
      </main>
    );
  }
}
