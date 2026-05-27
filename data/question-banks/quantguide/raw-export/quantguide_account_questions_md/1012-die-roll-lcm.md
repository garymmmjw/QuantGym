# QuantGuide Question

## 1012. Die Roll LCM

**Metadata**

- ID: `655wHS4eyEqw0SRWdsl2`
- URL: https://www.quantguide.io/questions/die-roll-lcm
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: TQD, luciela
- Tags: Expected Value, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-26 13:31:56 America/New_York
- Last Edited By: Gabe

### 题干

You have a 10-sided die. What is the expected number of times you must roll until the least common multiple of your die rolls exceeds $2000$? The answer can be written as a simplified fraction of the form $\dfrac{p}{q}$. Find $p + q$.

### Hint

What groups of numbers are enough to satisfy the condition?

### 解答

Notice that the least common multiple (LCM) of the integers from $1$ to $10$ is $2520$. It is therefore not possible to end up with any other LCM, as dividing $2520$ by any prime factor would yield a number smaller than $2000$. With some work, we see that we must obtain the numbers $7, 8, 9,$ and at least one of $5$ or $10$. Although we cannot directly apply the expected value expression for geometric random variable, we can consider two cases: $$$$

Case $1$: We get $7, 8,$ and $9$ before $5$ or $10$. Consider the sequence in which we encounter each of these values for the first time. Any permutation of this sequence is equally likely, so $7, 8,$ and $9$ are before $5$ or $10$ when the latter two are the final two values in the sequence, which occurs with probability $\dfrac{1}{{5 \choose 2}} = \dfrac{1}{10}$. $$$$

Case $2$: The complement of case $1$. Clearly, the probability of this case occurring is $\dfrac{9}{10}$. $$$$

Now we may consider the expected number of rolls before obtaining $7, 8,$ and $9$. $\dfrac{9}{10}$ of the time, a multiple of $5$ has already been obtained by then, and we are done. The other $\dfrac{1}{10}$ of the time, we must continue rolling until we obtain a multiple of $5$. Evaluating this with standard geometric expectation, we have $$\dfrac{10}{3} + \dfrac{10}{2} + \dfrac{10}{1} + \dfrac{1}{10} \cdot \dfrac{10}{2} = \dfrac{113}{6}$$
Our desired answer is $113 + 6 = 119$. Note that even if we didn't realize we could split the cases cleanly into whether we roll a multiple of $5$ before or after we roll $7, 8,$ and $9$, casework on the order in which we get the multiple of $5$ yields the same result, albeit with more computation.



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "119"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "655wHS4eyEqw0SRWdsl2",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-26 13:31:56 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 8219331,
    "source": "TQD, luciela",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Die Roll LCM",
    "topic": "probability",
    "urlEnding": "die-roll-lcm"
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "655wHS4eyEqw0SRWdsl2",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Die Roll LCM",
    "topic": "probability",
    "urlEnding": "die-roll-lcm"
  }
}
```
