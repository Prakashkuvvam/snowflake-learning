---
title: "Progress Dashboard"
weight: 23
---
# Progress Dashboard

{{< hint info >}}
Track your Snowflake learning journey with this interactive progress dashboard. Check off topics as you complete them.
{{< /hint >}}

<div id="snowflake-progress-dashboard">
  <div class="progress-stats">
    <div class="stat-card">
      <h3>Total Topics</h3>
      <span id="total-topics">16</span>
    </div>
    <div class="stat-card">
      <h3>Completed</h3>
      <span id="completed-topics">0</span>
    </div>
    <div class="stat-card">
      <h3>Progress</h3>
      <span id="progress-percentage">0%</span>
    </div>
    <div class="progress-bar-container">
      <div id="progress-bar" class="progress-bar" style="width: 0%;"></div>
    </div>
  </div>

  <div class="topic-checklist">
    <h2>Learning Topics</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Topic</th>
          <th>Status</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr data-topic="prerequisites-sql">
          <td>0</td>
          <td>SQL Prerequisites</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="prerequisites-sql"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="architecture-basics">
          <td>1</td>
          <td>Architecture & Warehouses</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="architecture-basics"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="data-loading">
          <td>2</td>
          <td>Data Loading</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="data-loading"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="querying-transformations">
          <td>3</td>
          <td>Querying & Transformations</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="querying-transformations"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="semi-structured-data">
          <td>4</td>
          <td>Semi-Structured Data</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="semi-structured-data"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="security-access-control">
          <td>5</td>
          <td>Security & Access Control</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="security-access-control"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="time-travel-cloning">
          <td>6</td>
          <td>Time Travel & Cloning</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="time-travel-cloning"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="streams-tasks">
          <td>7</td>
          <td>Streams & Tasks</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="streams-tasks"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="performance-optimization">
          <td>8</td>
          <td>Performance Optimization</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="performance-optimization"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="cost-management">
          <td>9</td>
          <td>Cost Management</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="cost-management"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="snowpark-advanced">
          <td>10</td>
          <td>Snowpark & Advanced</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="snowpark-advanced"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="data-sharing-marketplace">
          <td>11</td>
          <td>Data Sharing & Marketplace</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="data-sharing-marketplace"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="real-world-scenarios">
          <td>12</td>
          <td>Real-World Scenarios</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="real-world-scenarios"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="interview-questions">
          <td>13</td>
          <td>Interview Questions</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="interview-questions"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="practice-tests">
          <td>14</td>
          <td>Practice Tests (1–7)</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="practice-tests"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
        <tr data-topic="exam-preparation">
          <td>15</td>
          <td>Exam Preparation</td>
          <td><input type="checkbox" class="topic-checkbox" data-topic="exam-preparation"></td>
          <td><input type="text" class="note-input" placeholder="Your notes..."></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="study-sessions">
    <h2>Study Sessions</h2>
    <div class="session-log">
      <div class="session-entry">
        <label>Date:</label>
        <input type="date" id="session-date">
        <label>Hours Studied:</label>
        <input type="number" id="session-hours" min="0.5" step="0.5">
        <label>Topics Covered:</label>
        <input type="text" id="session-topics" placeholder="e.g., Architecture, Data Loading">
        <button id="log-session-btn" class="btn btn-primary">Log Session</button>
      </div>
      <div id="session-history">
        <h3>Session History</h3>
        <ul id="session-list"></ul>
      </div>
    </div>
  </div>
</div>

<script src="/assets/progress-dashboard.js"></script>
