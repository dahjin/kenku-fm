export function getBounds() {
  const controls = document.getElementById("controls");
  const drawer = document.getElementById("action-drawer");
  const drawerWidth = drawer?.clientWidth || 0;
  const y = controls?.clientHeight || 0;
  return {
    x: drawerWidth,
    y,
    width: window.innerWidth - drawerWidth,
    height: window.innerHeight - y,
  };
}
