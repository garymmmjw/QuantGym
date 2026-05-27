# QuantGuide Question

## 90. Voter Mayhem I

**Metadata**

- ID: `SKkgwWRenTi3kNBpaiUH`
- URL: https://www.quantguide.io/questions/voter-mayhem
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: AQR
- Source: ross, edited
- Tags: Conditional Probability
- Premium: True
- Solution Free: False
- Version: 4
- Last Edited: 2023-11-4 13:16:05 America/New_York
- Last Edited By: Gabe

### 题干

Two candidates, say $A$ and $B$, are running for office. Candidate $A$ received $n$ votes, while Candidate $B$ received $m$ votes, with $n > m$. The $n+m$ votes are thrown into a box and shuffled around. Then, the votes are drawn without replacement one-by-one. A running tally of the number of votes for each candidate is kept. The probability that Candidate $A$ is always strictly ahead in the voting count (excluding the initial state where both have $0$) is a function $P(n,m)$. Find $P(100,80)$.

### Hint

Use exchangeability and condition on who has the last vote. Then, test some edge cases with $m = 1$.

### 解答

Let $P(n,m)$ be the probability of interest with $n$ votes from Candidate $A$ and $m$ votes for Candidate $B$. Since the votes are thrown in the box randomly, the probability any given vote draw is for Candidate $A$ is $\dfrac{n}{m+n}$, while it is $\dfrac{m}{m+n}$ for Candidate $B$. Conditioning on which candidate has the last vote, we get that $$P(n,m) = P(n-1,m) \cdot \dfrac{n}{m+n} + P(n,m-1) \cdot \dfrac{m}{m+n}$$ This is because of the fact that the probability that $A$ is always ahead in all $n$ draws is the same as the probability that $A$ is always ahead if they received $n-1$ votes and $B$ received $m$ votes, which is $P(n-1,m)$. By the same argument, we get that the probability $A$ is always ahead with the last vote being for $B$ is the same as if $A$ is always ahead given $A$ had $n$ votes and $B$ had $m-1$ votes. Our goal is now find $P(n,m)$.

$$$$

A good warm-up is to consider an edge case of when $A$ has $n > 1$ votes and $B$ has $m = 1$ votes. $A$ would always be ahead exactly when the singular $B$ vote is not in the first two draws. If the $B$ vote is in the first two draws, then $B$ would have at least as many votes as $A$ at some point in the first two draws. Otherwise, if the first two draws are for $A$, $B$ can never reach more than $1$ vote. The probability of this is $\dfrac{n}{n+1} \cdot \dfrac{n-1}{n} = \dfrac{n-1}{n+1}$. This suggests to us to consider $\dfrac{n-m}{n+m}$ for a general $m$.

$$$$

To prove this, we induct on the value of $n+m$. If $n + m = 1$, this means $n = 1$ and $m = 0$. In this case, $P(1,0) = \dfrac{1-0}{1+0} = 1$, which is accurate. More generally, suppose this holds for when $n+m = k$ for all $1 \leq k \leq r$. We now need to show it holds for $n + m = r+1$. Using our recurrence, $$P(n,m) = \dfrac{n}{m+n} \cdot P(n-1,m) + \dfrac{m}{m+n} \cdot P(n,m-1) = \dfrac{n}{m+n} \cdot \dfrac{n-1-m}{n-1+m} + \dfrac{m}{m+n} \cdot \dfrac{n-(m-1)}{n+(m-1)} = \dfrac{n-m}{n+m}$$ We can use our recurrence relation here since if $n+m = r+1$, $n+(m-1) = (n-1)+m = r$, so the induction hypothesis applies.

$$$$

For our particular case, the answer is $\dfrac{100-80}{100+80}  =\dfrac{1}{9}$


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/9"
    ],
    "companies": [
      {
        "company": "AQR"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "SKkgwWRenTi3kNBpaiUH",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-4 13:16:05 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 630435,
    "source": "ross, edited",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Voter Mayhem I",
    "topic": "probability",
    "urlEnding": "voter-mayhem",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "AQR"
      }
    ],
    "difficulty": "hard",
    "id": "SKkgwWRenTi3kNBpaiUH",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Voter Mayhem I",
    "topic": "probability",
    "urlEnding": "voter-mayhem"
  }
}
```
