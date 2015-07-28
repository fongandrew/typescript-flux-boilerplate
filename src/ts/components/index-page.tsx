import React = require("react");
import FA = require("./_fontawesome");
import RabbitList = require("./rabbit-list");
import RabbitButtons = require("./rabbit-buttons");

class IndexPage extends React.Component<{}, {}> {
  render() {
    return (

      /* jsx */
      <div className="container">
        <div className="page-header">
          <h1><FA fa="rocket" /> Hello Rabbits</h1>
        </div>
        <div className="run-mode alert alert-info" role="alert">
          <FA fa="fw lg question-circle" />
          { "We are running in ", this.mode(), " mode" }
        </div>

        <RabbitList />
        <RabbitButtons />
      </div>
      /* jsx */

    );
  }

  private mode(): string {
    return (PRODUCTION ? "production" : "development");
  }
}

export = IndexPage;
