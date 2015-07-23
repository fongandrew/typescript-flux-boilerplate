import React = require("react");
import _ = require("lodash");

class FA extends React.Component<any, void> {
  public render() {
    return (
      <i className={"fa " + this.faClasses()}></i>
    );
  }

  private faClasses(): string {
    var fa = this.props.fa || "";
    var parts = fa.trim().split(/\s+/);
    return _.map(parts, function(part) {
      return "fa-" + part;
    }).join(" ");
  }
}

export = FA;