# QuantGuide Question

## 538. Doubly 5 II

**Metadata**

- ID: `YLBKS3MIdSpWk0M88NkU`
- URL: https://www.quantguide.io/questions/doubly-5-ii
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: SIG
- Source: tqd
- Tags: Discrete Random Variables, Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-10-1 12:06:32 America/New_York
- Last Edited By: Gabe

### 题干

Jenny has a fair $6-$sided die with numbers $1-6$ on the sides. Jenny continually rolls the die and keeps track of the outcomes in the order they appear. Jenny rolls until she sees two $5$s (not necessarily consecutive) OR both $4$ and $6$. Find the probability Jenny stops rolling due to seeing two $5$s.

### Hint

We are going to compute the complement of seeing $4$ and $6$ before two $5$s. The trick here is that no other rolls matter besides $4-6$. Therefore, conditioned on being in $4-6$, each of the three values appears with probability $1/3$. We only need to consider the orderings of the rolls $4,6,5,$ and $5$. What are the cases?

### 解答

We are going to compute the complement of seeing $4$ and $6$ before two $5$s. The trick here is that no other rolls matter besides $4-6$. Therefore, conditioned on being in $4-6$, each of the three values appears with probability $1/3$. We only need to consider the orderings of the rolls $4,6,5,$ and $5$. There are three cases where we get $4$ and $6$ before two $5$s.

$$$$

$\textbf{Case 1 - 5 on First Roll:}$ In this case, we need the next two rolls to be $4/6$ and then the other of $4/6$ that wasn't first. The probability of this case is $\dfrac{1}{3} \cdot \dfrac{2}{3} \cdot \dfrac{1}{2} = \dfrac{1}{9}$, as there is a $1/3$ chance $5$ is first, then $2/3$ chance of rolling $4/6$ before another $5$, and then $1/2$ chance of rolling the other of $4/6$ before a $5$. 

$$$$

$\textbf{Case 2 - 4/6 Comes First and Second:}$ In this case, the probability is just $\dfrac{2}{3} \cdot \dfrac{1}{2} = \dfrac{1}{3}$, as it is the same as Case 1 after we roll the $5$ in Case $1$.

$$$$

$\textbf{Case 3 - 4/6 Comes First and $5$ Comes Second:}$ In this case, the probability is $\dfrac{2}{3} \cdot \dfrac{1}{2}\cdot \dfrac{1}{2} = \dfrac{1}{6}$. There is a $2/3$ probability $4/6$ comes first, then a $1/2$ probability that $5$ comes before the other of $4/6$, and $1/2$ probability that the other of $4/6$ comes before the other $5$.

$$$$

Adding these up, we obtain a probability of $\dfrac{11}{18}$ that both $4$ and $6$ appear before two $5$s. Therefore, our answer is $1 - \dfrac{11}{18} = \dfrac{7}{18}$. This makes intuitive sense, as there are different permutations of $4$ and $6$ that they can appear in, whereas two $5$s only have one permutation.



### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "7/18"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "YLBKS3MIdSpWk0M88NkU",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-1 12:06:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 4285345,
    "source": "tqd",
    "status": "published",
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Doubly 5 II",
    "topic": "probability",
    "urlEnding": "doubly-5-ii",
    "version": 1
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "YLBKS3MIdSpWk0M88NkU",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Discrete Random Variables"
      },
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Doubly 5 II",
    "topic": "probability",
    "urlEnding": "doubly-5-ii"
  }
}
```
