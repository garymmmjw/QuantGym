import { TopbarShell } from "./TopbarShell.jsx";
import { AuthShell } from "./AuthShell.jsx";
import { AppShellMain } from "./AppShellMain.jsx";
import { TodoShell } from "./TodoShell.jsx";
import { SkillTemplate } from "./SkillTemplate.jsx";

export function AppShell() {
  return (
    <>
      <TopbarShell />
      <AuthShell />
      <AppShellMain />
      <TodoShell />
      <SkillTemplate />
    </>
  );
}
