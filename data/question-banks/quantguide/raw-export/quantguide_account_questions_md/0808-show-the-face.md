# QuantGuide Question

## 808. Show The Face

**Metadata**

- ID: `l7to8rioqYfRu9WV8fGE`
- URL: https://www.quantguide.io/questions/show-the-face
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: SIG, Citadel, Two Sigma, Five Rings
- Source: elchanan dice
- Tags: Conditional Probability, Conditional Expectation, Discrete Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-30 10:37:55 America/New_York
- Last Edited By: Gabe

### 题干

Roll a fair standard $6-$sided die until a $6$ appears. Given that the first $6$ occurs before the first $5$, find the expected number of times the die was rolled.

### Hint

An incorrect solution goes as follows: Since we want the first $6$ to appear before the first $5$, we can eliminate $5$ from our sample space and look at the reduced sample space conditional on no roll being a $5$. There are $5$ remaining values in this sample space that are equally probable, so the number of rolls needed to see a $6$ conditional on this information is $\text{Geom}(1/5)$, which has mean $5$. Therefore, the answer is $5$.

$$$$

Consider finding the conditional distribution of $N$ given this information.

### 解答

An incorrect solution goes as follows: Since we want the first $6$ to appear before the first $5$, we can eliminate $5$ from our sample space and look at the reduced sample space conditional on no roll being a $5$. There are $5$ remaining values in this sample space that are equally probable, so the number of rolls needed to see a $6$ conditional on this information is $\text{Geom}(1/5)$, which has mean $5$. Therefore, the answer is $5$

$$$$

This above solution is incorrect because it more implicitly assumes that we just "ignore" $5$s that appear. Therefore, this is not the correct assumption we want to make.

$$$$

Let's let $N$ represent the number of rolls needed to see a $6$, and let $B$ be the event that $6$ occurs before $5$. By symmetry, $\mathbb{P}[B] = 1/2$. We now condition on the value of the first roll. Let $R_i$ represent the event that we roll value $i$ on the first roll. This would imply by Law of Total Expectation that $$\mathbb{E}[N \mid B] = \sum_{i=1}^6 \mathbb{E}[N \mid R_i,B]\mathbb{P}[R_i \mid B]$$ For $i = 1,2,3,4$, we have that $\mathbb{P}[R_i \mid B] = \dfrac{P[B \mid R_i]\mathbb{P}[R_i]}{\mathbb{P}[B]}$. Since the event that we roll $i = 1,2,3,4$ on the first roll doesn't affect the probability of appearance of $6$ before $5$, we have that $\mathbb{P}[B \mid R_i] = \mathbb{P}[B]$. Clearly $\mathbb{P}[R_i] = 1/6$ based on the fact the die is fair, so $\mathbb{P}[R_i \mid B] = 1/6$ for $i = 1,2,3,4$. 


$$$$

We have that $\mathbb{P}[R_5 \mid B] = 0$, as there is no chance that our first roll can be $5$ is $6$ comes before $5$. Thus, since the conditional probability measure is a probability measure, we have that $\mathbb{P}[R_6 \mid B] = 1 - 4 \cdot 1/6 = 1/3$. 

$$$$

If we roll a $6$ on the first roll, then we get it in $1$ roll, so $\mathbb{E}[N \mid B,R_6] = 1$. Otherwise, if $i = 1,2,3,4$, then $\mathbb{E}[N \mid B,R_i] = 1 + \mathbb{E}[N \mid B]$, as we used up one roll and need to continue forward. Therefore, the equation we need to solve is $$\mathbb{E}[N \mid B] = \dfrac{2}{3}\left(1 + \mathbb{E}[N \mid B]\right) + \dfrac{1}{3}$$ This is easily solved to yield $\mathbb{E}[N \mid B] = 3$.

$$$$

You can instead view this problem as saying that whenever we roll a $5$ or $6$, we make it a $6$ so that the $6$ occurs before the $5$. Therefore, the probability of rolling a $5$ or $6$ on each trial is $1/3$, meaning that $N \mid B \sim \text{Geom}(1/3)$, which has mean $3$. This agrees with the answer above.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "3"
    ],
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "l7to8rioqYfRu9WV8fGE",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-30 10:37:55 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 6605409,
    "source": "elchanan dice",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Show The Face",
    "topic": "probability",
    "urlEnding": "show-the-face",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      },
      {
        "company": "Citadel"
      },
      {
        "company": "Two Sigma"
      },
      {
        "company": "Five Rings"
      }
    ],
    "difficulty": "medium",
    "id": "l7to8rioqYfRu9WV8fGE",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      },
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Show The Face",
    "topic": "probability",
    "urlEnding": "show-the-face"
  }
}
```
