export const DisplayError = ({ error }) => {
  return (
    <div style={{ color: "red", textAlign: "center", fontSize: "24px", padding: "24px" }}>
      {error?.toString() ?? "An unknown error occurred"}
    </div>
  );
};
