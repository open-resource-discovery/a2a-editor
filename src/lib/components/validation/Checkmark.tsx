import type { FC } from "react";

const Checkmark: FC = () => {
  return (
    <svg className="a2a-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle className="a2a-checkmark-circle" cx="26" cy="26" r="25" fill="none" />
      <path className="a2a-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
    </svg>
  );
};

export default Checkmark;
