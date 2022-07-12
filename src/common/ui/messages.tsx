import * as React from "react";

/**
 * A message displayed to the user.
 */
export interface Message {
    color: "success" | "danger" | "warning" | "info" | "primary" | "secondary";
    message: string;
    stayForMillis: number;
}

/**
 * Add a message to display to the user.
 *
 * @param message The message to display.
 */
export function addMessage(message: Message) {
    const messageArray = messages.state.messages;
    messageArray.push(message);
    messages.setState({
        messages: messageArray
    });
    if (message.stayForMillis) {
        setTimeout(() => {
            const messageArray = messages.state.messages.slice();
            const index = messageArray.indexOf(message);
            if (index >= 0) {
                messageArray.splice(index, 1);
                messages.setState({
                    messages: messageArray
                });
            }
        }, message.stayForMillis);
    }
}

let messages: Messages;

export interface MessagesState {
    messages: Message[];
}

/**
 * A component for rendering the messages.
 */
export default class Messages extends React.Component<{}, MessagesState> {
    constructor(props) {
        super(props);
        messages = this;
        this.state = {
            messages: []
        };
    }

    closeMessage(e: React.MouseEvent, message: Message) {
        e.preventDefault();

        const index = this.state.messages.indexOf(message);
        if (index >= 0) {
            const messages = this.state.messages.slice();
            messages.splice(index, 1);
            this.setState({
                messages
            });
        }
    }

    render() {
        return (
            <div className="message-container">
                <div className="container">
                    {this.state.messages.map((value, index) => {
                        return (
                            <div key={index} className={ "alert alert-dismissible alert-" + value.color }>
                                <span>{ value.message }</span>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Close"
                                    onClick={(e) => this.closeMessage(e, value)}
                                ></button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}