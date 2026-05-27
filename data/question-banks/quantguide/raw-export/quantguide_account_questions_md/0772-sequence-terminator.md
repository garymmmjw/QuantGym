# QuantGuide Question

## 772. Sequence Terminator

**Metadata**

- ID: `NOLtRNIPaLwVRgctgcKS`
- URL: https://www.quantguide.io/questions/sequence-terminator
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Two Sigma, Five Rings, SIG, Citadel
- Source: mit doc
- Tags: Conditional Expectation, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-10-30 10:38:07 America/New_York
- Last Edited By: Gabe

### 题干

A fair $6-$sided die is rolled repetitively, forming a sequence of values, under the following rules: If any even value is rolled, add it to the current sequence. If a $3$ or $5$ is rolled, discard the entire sequence and don't add the $3$ or $5$ to the start of the new sequence. If a $1$ is rolled, add the $1$ to the current sequence and end the game. Find the expected length of the sequence at the end of the game.

$$$$

For example if the sequence of rolls is $34265241$, we would reset to an empty sequence at the first roll, reset to an empty sequence at the $5$, and our final sequence would be $241$, which is of length $3$.

### Hint

An incorrect solution goes as follows: We will have no $3$s or $5$s appearing before the first $1$, as they reset the sequence and are not added. Therefore, our sample space is really $1,2,4,$ and $6$. On average, the $1$ will appear after $4$ throws of the die, so the answer is $4$.

$$$$

This above solution is incorrect because it more implicitly assumes that we just "ignore" $3$s and $5$s that appear. Therefore, this is not the correct assumption we want to make. Instead, we can reframe this problem as follows: At some point, the last $3$ or $5$ will appear before the first $1$. As the die is memoryless (i.e. is not affected by what has already appeared), given that the first $1$ appears before both the first $3$ and first $5$, what is the expected number of rolls needed to obtain the $1$?


### 解答

An incorrect solution goes as follows: We will have no $3$s or $5$s appearing before the first $1$, as they reset the sequence and are not added. Therefore, our sample space is really $1,2,4,$ and $6$. On average, the $1$ will appear after $4$ throws of the die, so the answer is $4$.

$$$$

This above solution is incorrect because it more implicitly assumes that we just "ignore" $3$s and $5$s that appear. Therefore, this is not the correct assumption we want to make. Instead, we can reframe this problem as follows: At some point, the last $3$ or $5$ will appear before the first $1$. As the die is memoryless (i.e. is not affected by what has already appeared), given that the first $1$ appears before both the first $3$ and first $5$, what is the expected number of rolls needed to obtain the $1$?

$$$$

Let's let $N$ represent the number of rolls needed to see a $1$, and let $B$ be the event that $1$ occurs before both $3$ and $5$. By symmetry, $\mathbb{P}[B] = 1/3$, as each is equally likely to appear first. We now condition on the value of the first roll. Let $R_i$ represent the event that we roll value $i$ on the first roll. This would imply by Law of Total Expectation that $$\mathbb{E}[N \mid B] = \sum_{i=1}^6 \mathbb{E}[N \mid R_i,B]\mathbb{P}[R_i \mid B]$$ For $i = 2,4,6$, we have that $\mathbb{P}[R_i \mid B] = \dfrac{P[B \mid R_i]\mathbb{P}[R_i]}{\mathbb{P}[B]}$. Since the event that we roll $i = 2,4,6$ on the first roll doesn't affect the probability of appearance of $1$ before $3$ and $5$, we have that $\mathbb{P}[B \mid R_i] = \mathbb{P}[B]$. Clearly $\mathbb{P}[R_i] = 1/6$ based on the fact the die is fair, so $\mathbb{P}[R_i \mid B] = 1/6$ for $i = 2,4,6$. 
 

$$$$

We have that $\mathbb{P}[R_3 \mid B] = \mathbb{P}[R_5 \mid B] = 0$, as there is no chance that our first roll can be $3$ or $5$ if $1$ comes before them. Thus, since the conditional probability measure is a probability measure, we have that $\mathbb{P}[R_1 \mid B] = 1 - 3 \cdot 1/6 = 1/2$. 

$$$$

If we roll a $1$ on the first roll, then our sequence is complete and of length $1$, so $\mathbb{E}[N \mid B,R_1] = 1$. Otherwise, if $i = 2,4,6$, then $\mathbb{E}[N \mid B,R_i] = 1 + \mathbb{E}[N \mid B]$, as we used up one roll and need to continue forward. Therefore, the equation we need to solve is $$\mathbb{E}[N \mid B] = \dfrac{1}{2}\left(1 + \mathbb{E}[N \mid B]\right) + \dfrac{1}{2}$$ This is easily solved to yield $\mathbb{E}[N \mid B] = 2$.

$$$$

You can instead view this problem as saying that whenever we roll a $1,3,$ or $5$, we make it a $1$ so that the $1$ occurs before the $3$ and $5$. Therefore, the probability of rolling an odd integer on each trial is $1/2$, meaning that $N \mid B \sim \text{Geom}(1/2)$, which has mean $2$. This agrees with the answer above.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2"
    ],
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "NOLtRNIPaLwVRgctgcKS",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-30 10:38:07 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6300249,
    "source": "mit doc",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Sequence Terminator",
    "topic": "probability",
    "urlEnding": "sequence-terminator",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Two Sigma"
      },
      {
        "company": "Five Rings"
      },
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      }
    ],
    "difficulty": "hard",
    "id": "NOLtRNIPaLwVRgctgcKS",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Sequence Terminator",
    "topic": "probability",
    "urlEnding": "sequence-terminator"
  }
}
```
