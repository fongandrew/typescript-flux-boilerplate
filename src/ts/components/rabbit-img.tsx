import React = require("react/addons");
import rabbits = require("../collections/rabbits");
import rabbitActions = require("../actions/rabbit-actions");

interface IRabbitImgProps {
  key: string;
  rabbit: rabbits.Rabbit;
}

class RabbitImg extends React.Component<IRabbitImgProps, {}> {
  constructor(props: IRabbitImgProps) {
    super(props);
  }

  render(): JSX.Element {
    let rabbit = this.props.rabbit;

    return (
      /* jsx */
      <div className="rabbit-img-wrapper">
        <img src={rabbit.image()} 
             key={rabbit._id}
             className="img-circle inflatable-inner"
             onClick={this.handleClick} />
      </div>
      /* jsx */
    );
  }

  // Arrow function preserves "this"
  private handleClick = (): void => {
    rabbitActions.destroy(this.props.rabbit._id);
  }
}

export = RabbitImg;
