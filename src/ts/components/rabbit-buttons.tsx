import _ = require("lodash");
import React = require("react/addons");
import rabbits = require("../collections/rabbits");
import rabbitActions = require("../actions/rabbit-actions");
import FA = require("./_fontawesome");

interface IRabbitButtonProps {
  color: rabbits.Color;
}

class RabbitButton extends React.Component<IRabbitButtonProps, {}> {
  render() {
    let buttonText = "";
    let buttonClasses = "";

    switch(this.props.color) {
      case rabbits.Color.BROWN:
        buttonText = "Brown";
        buttonClasses = "brown-btn";
        break;

      case rabbits.Color.BLACK:
        buttonText = "Black";
        buttonClasses = "black-btn";
        break;

      case rabbits.Color.GRAY:
        buttonText = "Gray";
        buttonClasses = "gray-btn";
        break;

      default:
        // Nothing
    }

    return (
      /* jsx */
      <button type="button" 
              className={"btn btn-primary " + buttonClasses}
              onClick={this.handleClick} >
        {buttonText}
      </button>
      /* jsx */
    );
  }

  // Arrow function preserves "this"
  private handleClick = (): void => {
    rabbitActions.create(this.props.color);
  }
}

class RabbitButtons extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
  }

  render() {
    return (

      /* jsx */
      <div className="rabbit-buttons panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">
            <FA fa="fw plus" />
            Insert Rabbit
          </h3>
        </div>
        <div className="panel-body">
          <RabbitButton color={rabbits.Color.BROWN} />
          <RabbitButton color={rabbits.Color.BLACK} />
          <RabbitButton color={rabbits.Color.GRAY} />
        </div>
      </div>
      /* jsx */

    );
  }
}

export = RabbitButtons;
