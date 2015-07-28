import _ = require("lodash");
import React = require("react");
import rabbits = require("../collections/rabbits");

interface IRabbitProps {}

interface IRabbitState {
  rabbits: rabbits.Rabbit[];
}

class RabbitList extends React.Component<IRabbitProps, IRabbitState> {
  constructor(props: IRabbitProps) {
    super(props);
    this.state = { rabbits: [] };
  }

  render(): JSX.Element {
    let rabbits = _.map(this.state.rabbits, 
      function(rabbit: rabbits.Rabbit) {
        return (
          /* jsx */
          <img src={rabbit.image()} className="img-circle" key={rabbit._id} />
          /* jsx */
        );
    });

    return (
      /* jsx */
      <div className="rabbit-list">
        {rabbits}
      </div>
      /* jsx */
    );
  }

  componentDidMount(): void {
    rabbits.store.addChangeListener(this.onChange);
  }

  componentWillUnmount(): void {
    rabbits.store.removeChangeListener(this.onChange);
  }

  // Callback triggered by the rabbit store listener
  // Implement as arrow function so "this" value is properly referenced
  private onChange = (): void => this.setState(this.getState());

  private getState(): IRabbitState {
    return {
      rabbits: rabbits.store.getAll()
    };
  }
}

export = RabbitList;
