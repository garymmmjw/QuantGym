# QuantGuide Question

## 348. Voter Mayhem II

**Metadata**

- ID: `XWtOdaD56yLGh6SZdPOK`
- URL: https://www.quantguide.io/questions/voter-mayhem-ii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: AQR
- Source: ross
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-4 13:21:18 America/New_York
- Last Edited By: Gabe

### 题干

Two candidates, say $A$ and $B$, are running for office. Candidate $A$ received $n$ votes, while Candidate $B$ received $m$ votes, with $n > m$. The $n+m$ votes are thrown into a box and shuffled around. Then, the votes are drawn without replacement one-by-one. A running tally of the number of votes for each candidate is kept. The probability that Candidate $A$ is never behind in the voting count (excluding the initial state where both have $0$) is a function $Q(n,m)$. Find $Q(100,80)$.

### Hint

Condition on the last vote to derive a recurrence relation and then consider edge cases where $B$ has $m = 1$ votes.

### 解答

Let $Q(n,m)$ be the probability of interest with $n$ votes from Candidate $A$ and $m$ votes for Candidate $B$. Since the votes are thrown in the box randomly, the probability any given vote draw is for Candidate $A$ is $\dfrac{n}{m+n}$, while it is $\dfrac{m}{m+n}$ for Candidate $B$. Conditioning on which candidate has the last vote, we get that $$Q(n,m) = Q(n-1,m) \cdot \dfrac{n}{m+n} + Q(n,m-1) \cdot \dfrac{m}{m+n}$$ This is because of the fact that the probability that $A$ is never behind in all $n$ draws is the same as the probability that $A$ is not behind if they received $n-1$ votes and $B$ received $m$ votes, which is $Q(n-1,m)$. By the same argument, we get that the probability $A$ is never behind with the last vote being for $B$ is the same as if $A$ is never behind given $A$ had $n$ votes and $B$ had $m-1$ votes. Our goal is now find $Q(n,m)$.

$$$$

A good warm-up is to consider an edge case of when $A$ has $n > 1$ votes and $B$ has $m = 1$ votes. $A$ would never be behind exactly when the singular $B$ vote is not the first one drawn. The probability of this is $\dfrac{n}{n+1}$. This suggests to us to consider $\dfrac{n}{n+m}$ for a general $m$.

$$$$

To prove this, we induct on the value of $n+m$. If $n + m = 1$, this means $n = 1$ and $m = 0$. In this case, $Q(1,0) = \dfrac{1}{1+0} = 1$, which is accurate. More generally, suppose this holds for when $n+m = k$ for all $1 \leq k \leq r$. We now need to show it holds for $n + m = r+1$. Using our recurrence, $$Q(n,m) = \dfrac{n}{m+n} \cdot Q(n-1,m) + \dfrac{m}{m+n} \cdot Q(n,m-1) = \dfrac{n}{m+n} \cdot \dfrac{n-1}{n-1+m} + \dfrac{m}{m+n} \cdot \dfrac{n}{n+(m-1)} = \dfrac{n}{n+m}$$ We can use our recurrence relation here since if $n+m = r+1$, $n+(m-1) = (n-1)+m = r$, so the induction hypothesis applies.

$$$$

For our particular case, the answer is $\dfrac{100}{100+80}  =\dfrac{5}{9}$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/9"
    ],
    "companies": [
      {
        "company": "AQR"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "XWtOdaD56yLGh6SZdPOK",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 13:21:18 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2664268,
    "source": "ross",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Voter Mayhem II",
    "topic": "probability",
    "urlEnding": "voter-mayhem-ii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "AQR"
      }
    ],
    "difficulty": "hard",
    "id": "XWtOdaD56yLGh6SZdPOK",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Voter Mayhem II",
    "topic": "probability",
    "urlEnding": "voter-mayhem-ii"
  }
}
```
