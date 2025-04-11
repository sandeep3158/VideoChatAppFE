import { Button, TextInput } from "flowbite-react";
import PropTypes from "prop-types";

export const ChatComp = ({
  messages,
  input,
  setInput,
  sendMessage,
  socketId,
}) => {
  return (
    <div className="w-[35%] flex flex-col bg-white p-4 border border-gray-200 shadow-md rounded-lg max-h-full">
      <h3 className="text-xl font-semibold mb-2 text-center">Chat</h3>
      <div className="flex-grow border border-gray-200 rounded-lg p-2 overflow-auto mb-4 space-y-2">
        {messages.map((message, index) => {
          const isSelf = socketId === message.userId;
          return (
            <div
              key={index}
              className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-lg text-sm ${
                  isSelf
                    ? "bg-gray-200 text-gray-800"
                    : "bg-blue-500 text-white"
                }`}
              >
                {message.msg}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <TextInput
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <Button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
        >
          Send
        </Button>
      </div>
    </div>
  );
};

ChatComp.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      userId: PropTypes.string.isRequired,
      msg: PropTypes.string.isRequired,
    })
  ).isRequired,
  socketId: PropTypes.string.isRequired,
  input: PropTypes.string.isRequired,
  setInput: PropTypes.func.isRequired,
  sendMessage: PropTypes.func.isRequired,
};
