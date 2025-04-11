import { Button, TextInput } from "flowbite-react";
import PropTypes from "prop-types";

export const Lobby = ({ onEnterChat }) => {
  return (
    <form
      className="p-6 flex justify-center items-center min-h-screen"
      onSubmit={onEnterChat}
    >
    <div className="relative flex flex-col gap-6 border rounded-xl shadow-md p-8 w-full max-w-md bg-white -mt-40">
        <h1 className="text-2xl font-semibold text-center">Enter Username</h1>
        <TextInput
          id="username"
          name="username"
          required
          placeholder="Enter your username"
          aria-label="Username"
        />
        <Button className="w-full" type="submit">
          Connect
        </Button>
      </div>
    </form>
  );
};

Lobby.propTypes = {
  onEnterChat: PropTypes.func.isRequired,
};
