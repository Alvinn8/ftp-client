import * as React from "react";
import { readNbt } from "../../../nbt/nbt";
import { NbtCompound } from "../../../nbt/nbtTags";
import UiNbtCompound from "./UiNbtCompound";

interface State {
    tag: NbtCompound;
    error: string;
}

export default class NbtTest extends React.Component<{}, State> {
    state = {
        tag: null,
        error: null
    };

    render() {
        return (
            <div>
                <input type="file" name="nbttest" id="nbttest" onChange={this.onChange.bind(this)} />
                {this.state.tag != null && (
                    <UiNbtCompound nbtCompound={this.state.tag} root={true} />
                )}
                {this.state.error != null && (
                    <p style={{ "color": "red" }}>{this.state.error}</p>
                )}
            </div>
        );
    }

    async onChange(event: React.ChangeEvent<HTMLInputElement>) {
        const blob = event.target.files[0];
        try {
            const result = await readNbt(blob);
            const tag = result.tag;
            if (!(tag instanceof NbtCompound)) {
                throw new Error("Got a non compound tag: " + tag);
            }
            console.log(result);
            this.setState({
                tag,
                error: null
            });
        } catch(e) {
            this.setState({
                tag: null,
                error: e.toString()
            });
        }
    }
}