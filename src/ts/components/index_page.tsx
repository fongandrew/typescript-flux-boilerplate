import React = require("react");
import FA = require("./_fontawesome");

class IndexPage extends React.Component<any, void> {
  public render() {
    return (

      /* jsx */
      <div className="container">
        <div className="page-header">
          <h1><FA fa="rocket" /> Hello World</h1>
        </div>
        <div className="run-mode alert alert-info" role="alert">
          <FA fa="fw lg question-circle" />
          { "We are running in ", this.mode(), " mode" }
        </div>
      </div>
      /* jsx */

    );
  }

  private mode(): string {
    return (PRODUCTION ? "production" : "development");
  }
}

export = IndexPage;
