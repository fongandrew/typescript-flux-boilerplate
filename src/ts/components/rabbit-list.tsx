import _ = require("lodash");
import React = require("react/addons");
import rabbits = require("../collections/rabbits");
import RabbitImg = require("./rabbit-img");

let CSSTransitionGroup = React.addons.CSSTransitionGroup;

interface IRabbitListProps {}

interface IRabbitListState {
  rabbits: rabbits.Rabbit[];
}

class RabbitList extends React.Component<IRabbitListProps, IRabbitListState> {
  constructor(props: IRabbitListProps) {
    super(props);
    this.state = { rabbits: [] };
  }

  render(): JSX.Element {
    let rabbits = _.map(this.state.rabbits, 
      function(rabbit: rabbits.Rabbit) {
        return (
          /* jsx */
          <RabbitImg rabbit={rabbit} key={rabbit._id} />
          /* jsx */
        );
    });

    return (
      /* jsx */
      <div className="rabbit-list">
        <CSSTransitionGroup transitionName="inflatable">
          {rabbits}
        </CSSTransitionGroup>
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

  // Get all rabbits, sort by date, ascending
  private getState(): IRabbitListState {
    return {
      rabbits: _.sortBy(rabbits.store.getAll(), 
        function(rabbit: rabbits.Rabbit): number {
          return rabbit.createdOn.getTime();
        })
    };
  }
}

export = RabbitList;
