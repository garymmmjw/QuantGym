# QuantGuide Question

## 763. Ramanujan's Run

**Metadata**

- ID: `ySVeEY1CHrIyYBODIOqT`
- URL: https://www.quantguide.io/questions/ramanujans-run
- Topic: probability
- Difficulty: medium
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Events, Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Ramanujan is running late to teach his lecture. He must run a mile across Cambridge to the lecture hall within ten minutes in order to get to his students on time. Beginning with attempt $n = 1$, he runs a distance of $x_n$ miles in $t_n$ minutes towards the lecture hall and repeats the process if he has (1) not yet arrived at the hall and (2) still has time to spare; the maximum value of $n$ is 3. The values of $x_n$ are chosen independently and uniformly at random between $0$ and $1$ miles, while the values of $t_n$ are chosen independently and uniformly at random between $0$ and $10$ minutes. If Ramanujan runs out of time during his $j$-th attempt, then time magically stops, allowing him to finish traveling the remainder of the $x_j$ miles. If Ramanujan runs equal to or more than a mile total within the ten minutes, then he arrives at the hall on time. What is the probability that Ramanujan gets to the lecture hall on time?

### Hint

How can geometric probability be useful here? Consider graph shading as a possible approach to this problem.

### 解答

First, to simplify things, let's consider 10 minutes as 1 complete unit of time. We have:
\[\begin{aligned}
X_1, X_2, X_3 &\overset{\text{iid}}{\sim} \text{Unif}([0, 1]), \text{and} \\
T_1, T_2, T_3 &\overset{\text{iid}}{\sim} \text{Unif}([0, 1]).
\end{aligned}\]
Note that Ramanujan may either take two attempts or three attempts to reach the lecture hall. As long as Ramanujan has some time left over (for example, if $T_1 < 1$), then he will have the opportunity to run another time (that is—in our example—Ramanujan will add $X_2$ to his total distance traveled regardless of the value of $T_2$). We wish to find the probability that Ramanujan makes it to class on time, which can be expressed as
\[\begin{aligned}
\mathbb{P}(X_1 + X_2 > 1, T_1 < 1) + \mathbb{P}(X_1 + X_2 < 1, X_1 + X_2 + X_3 > 1, T_1 + T_2 < 1).
\end{aligned}\]
Note that the events $X_1 + X_2 > 1, T_1 < 1$ and $X_1 + X_2 < 1, X_1 + X_2 + X_3 > 1, T_1 + T_2 < 1$ are in fact mutually exclusive, which justifies the application of countable additivity. Now, let's simplify, making use of the fact that events only involving $T_n$ are independent from events only involving $X_n$. 
\[\begin{aligned}
&\quad \; \mathbb{P}(\text{Ramanujan on time}) \\
&= \mathbb{P}(X_1 + X_2 > 1, T_1 < 1) + \mathbb{P}(X_1 + X_2 < 1, X_1 + X_2 + X_3 > 1, T_1 + T_2 < 1) \\
&= \mathbb{P}(X_1 + X_2 > 1) \mathbb{P}(T_1 < 1) + \mathbb{P}(X_1 + X_2 < 1, X_1 + X_2 + X_3 > 1) \mathbb{P}(T_1 + T_2 < 1) \\
&= \mathbb{P}(X_1 + X_2 > 1) + \mathbb{P}(X_1 + X_2 < 1, X_1 + X_2 + X_3 > 1) \mathbb{P}(T_1 + T_2 < 1) \\
\end{aligned}\]
Notice that $\mathbb{P}(T_1 + T_2 < 1) = \mathbb{P}(T_1 + T_2 > 1) = \mathbb{P}(X_1 + X_2 < 1) = \mathbb{P}(X_1 + X_2 > 1)$. We quickly find $\mathbb{P}(T_1 + T_2 < 1) = \frac{1}{2}$ by plotting the inequality on the $T_1$-$T_2$ plane. More specifically, one may compute this probability with
\[\begin{aligned}
\mathbb{P}(T_1 + T_2 < 1) &= \int_{0}^1 \int_{0}^{1 - t_2} \; f_{T_1, T_2}(t_1, t_2) \; dt_1 \, dt_2, \text{ where } \\
f_{T_1, T_2}(t_1, t_2) &= f_{T_1}(t_1) f_{T_2}(t_2) = 1 \quad \text{ due to independence }
\end{aligned}\]
Substituting, we have
\[\begin{aligned}
\mathbb{P}(\text{Ramanujan on time}) &= \frac{1}{2} + \frac{1}{2} \cdot \mathbb{P}(X_1 + X_2 + X_3 > 1, X_1 + X_2 < 1). 
\end{aligned}\]
It is much easier to compute $\mathbb{P}(X_1 + X_2 + X_3 > 1, X_1 + X_2 < 1)$ by plotting the region satisfying the inequality $X_1 + X_2 + X_3 > 1$ on the $X_1$-$X_2$-$X_3$ plane, where the volume of interest is strictly above the region $ X_1 + X_2 < 1$ on the $X_1$-$X_2$ plane. However, one may choose to compute this probability as follows:
\[\begin{aligned}
&\quad\; \mathbb{P}(X_1 + X_2 + X_3 > 1, X_1 + X_2 < 1)\\
&= \int_{0}^1 \int_{0}^{1 - x_2} \int_{1-x_1-x_2}^1 f_{X_1, X_2, X_3}(x_1, x_2, x_3) \, dx_3 \, dx_1 \, dx_2, \text{where} \\
f_{X_1, X_2, X_3}(x_1, x_2, x_3) &= f_{X_1}(x_1) f_{X_2}(x_2) f_{X_3}(x_3) = 1 \quad \text{ due to independence }
\end{aligned}\]
The value of the above integral is $\frac{1}{3}$. So,
\[\begin{aligned}
\mathbb{P}(\text{Ramanujan on time}) &= \frac{1}{2} + \frac{1}{6} \\
&= \frac{2}{3}
\end{aligned}\]

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/3"
    ],
    "difficulty": "medium",
    "id": "ySVeEY1CHrIyYBODIOqT",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6228703,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Ramanujan's Run",
    "topic": "probability",
    "urlEnding": "ramanujans-run"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "ySVeEY1CHrIyYBODIOqT",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      },
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Ramanujan's Run",
    "topic": "probability",
    "urlEnding": "ramanujans-run"
  }
}
```
