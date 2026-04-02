import { Outlet } from "react-router-dom";

const Home = () => {
  console.log("run home");

  return (
    <div>
      Home
      <Outlet />
    </div>
  );
};

export default Home;
