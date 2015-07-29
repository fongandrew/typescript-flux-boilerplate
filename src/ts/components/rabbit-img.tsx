import React = require("react/addons");
import rabbits = require("../collections/rabbits");
import rabbitActions = require("../actions/rabbit-actions");
import store = require("../lib/store");
import FA = require("./_fontawesome");

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
    let inFlightCls: string = "";
    let syncIndicator: any = null;
    if (rabbit.dataStatus === store.DataStatus.INFLIGHT) {
      inFlightCls = "in-flight";
      syncIndicator = (
        /* jsx */
        <div className="sync-spinner">
          <FA fa="refresh spin" />
        </div>
        /* jsx */
      );
    } 

    return (
      /* jsx */
      <div className="rabbit-img-wrapper">
        <img src={rabbit.image()} 
             key={rabbit._id}
             className={"img-circle inflatable-inner " + inFlightCls}
             onClick={this.handleClick} />
        {syncIndicator}
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
