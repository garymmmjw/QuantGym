# QuantGuide Question

## 827. Dual Die View

**Metadata**

- ID: `LSpf5dJOJSQQHTw3K7Ux`
- URL: https://www.quantguide.io/questions/dual-die-view
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: original
- Tags: Conditional Expectation
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

You have two fair $6-$sided dice. At each round, you roll both dice and record the upfaces. Find the expected number of rounds you need to perform to observe all $6$ faces of the dice.

### Hint

The key here is to set up a Markov chain. Let $e_i$ be the expected number of rounds it takes given you already have $i$ distinct faces. We want $e_0$. The boundary condition is that $e_6 = 0$, as we would already be done at that point.

### 解答

The key here is to set up a Markov chain. Let $e_i$ be the expected number of rounds it takes given you already have $i$ distinct faces. We want $e_0$. The boundary condition is that $e_6 = 0$, as we would already be done at that point. We can work backwards on this.

$$$$

We would have that $e_5 = 1 + \dfrac{25}{36}e_5 + \dfrac{11}{36}e_6$. This is because if we already have $5$ values, then with probability $\dfrac{5}{6}$ per die we roll a value that has already been rolled. This doesn't contribute to anything further, so $e_5 = \dfrac{36}{11}$ after rearranging.

$$$$

We would have that $e_4 = 1 + \dfrac{16}{36}e_4 + \dfrac{18}{36}e_5+ \dfrac{2}{36}e_6$ because of the fact that if we have $4$ values, with probability $\dfrac{4}{6}$ per die we roll a value we have already seen. We get the $\dfrac{2}{36}$ from the fact that the first die has $2$ values that could appear that are new and only $1$ new value for the last one. As the probabilities must sum to $1$, the coefficient of $e_5$ must be $\dfrac{18}{36}$. Substituting in, we get that $e_4 = \dfrac{271}{55}$.

$$$$

Continuing this pattern, we have that $e_3 = 1 + \dfrac{9}{36}e_3 + \dfrac{21}{36}e_4 + \dfrac{6}{36}e_5$ by similar logic to the above. For example, to get $2$ new distinct values, there are $3$ values the first die can take and $2$ values the second can take. Plugging in the prior values gives $e_3 = \dfrac{949}{165}$. The equations for the remaining values are 
\[
\begin{aligned}
&e_2 = 1 + \dfrac{4}{36}e_2 + \dfrac{20}{36}e_3 + \dfrac{12}{36}e_4 \\
&e_1 = 1 + \dfrac{1}{36}e_1 + \dfrac{15}{36}e_2 + \dfrac{20}{36}e_3 \\ 
&e_0 = 1 + \dfrac{1}{6}e_1 + \dfrac{5}{6}e_2

\end{aligned}
\]
$$$$

When finishing up the solving of the system above, the final result is $e_0 = \dfrac{70219}{9240} \approx 7.6$. This is just above the $7.35$ that you get if you were to divide the solution for one die $(14.7)$ by two. This is a good sanity check.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "70219/9240"
    ],
    "companies": [],
    "difficulty": "medium",
    "id": "LSpf5dJOJSQQHTw3K7Ux",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6790853,
    "randomizable": "",
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Dual Die View",
    "topic": "probability",
    "urlEnding": "dual-die-view"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "LSpf5dJOJSQQHTw3K7Ux",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      }
    ],
    "title": "Dual Die View",
    "topic": "probability",
    "urlEnding": "dual-die-view"
  }
}
```
